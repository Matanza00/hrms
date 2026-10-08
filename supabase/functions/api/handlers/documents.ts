import type { Ctx } from "../_shared/context.ts";
import { numOrNull, str } from "../_shared/context.ts";
import { requireAdmin, requireCaller } from "../_shared/auth.ts";
import { ApiError } from "../_shared/errors.ts";
import { camelizeRow, camelizeRows } from "../_shared/case.ts";

const BUCKET = "employee-docs";
const SIGNED_URL_TTL = 60 * 60; // 1 hour

/** An employee may read their own docs; admins read anyone's. */
function assertCanRead(ctx: Ctx, employeeId: string) {
  const caller = requireCaller(ctx.caller);
  if (caller.role !== "Admin" && caller.employeeId !== employeeId) {
    throw new ApiError("Not allowed", 403);
  }
  return caller;
}

export async function getEmployeeDocuments(ctx: Ctx) {
  const employeeId = str(ctx.data.employeeId);
  if (!employeeId) throw new ApiError("employeeId is required");
  assertCanRead(ctx, employeeId);

  const { data, error } = await ctx.svc
    .from("documents")
    .select("*")
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false });
  if (error) throw new ApiError(error.message, 500);

  const rows = camelizeRows<Record<string, unknown>>(data);
  // Attach a short-lived signed URL so the browser can download each file.
  for (const row of rows) {
    const path = str(row.filePath);
    if (!path) continue;
    const { data: signed } = await ctx.svc.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL);
    row.url = signed?.signedUrl ?? null;
  }
  return rows;
}

/** Decode a base64 payload (optionally a data: URL) to bytes. */
function decodeBase64(input: string): Uint8Array {
  const comma = input.indexOf(",");
  const b64 = input.startsWith("data:") && comma >= 0 ? input.slice(comma + 1) : input;
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function safeName(name: string) {
  return (name || "file").replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 120);
}

export async function uploadEmployeeDocument(ctx: Ctx) {
  const caller = requireAdmin(ctx.caller);
  const employeeId = str(ctx.data.employeeId);
  const title = str(ctx.data.title);
  const fileName = safeName(str(ctx.data.fileName));
  const mimeType = str(ctx.data.mimeType) || "application/octet-stream";
  const base64 = str(ctx.data.dataBase64);

  if (!employeeId) throw new ApiError("employeeId is required");
  if (!base64) throw new ApiError("file data is required");
  if (!fileName) throw new ApiError("fileName is required");

  const bytes = decodeBase64(base64);
  if (bytes.byteLength === 0) throw new ApiError("The file is empty");
  if (bytes.byteLength > 8 * 1024 * 1024) {
    throw new ApiError("File is larger than 8 MB. Please upload a smaller file.", 413);
  }

  // Unique-ish path without Math.random (Deno timers aside, keep it simple).
  const stamp = Date.now();
  const path = `${employeeId}/${stamp}-${fileName}`;

  const { error: upErr } = await ctx.svc.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: mimeType, upsert: false });
  if (upErr) throw new ApiError(`Upload failed: ${upErr.message}`, 500);

  const row = {
    employee_id: employeeId,
    title: title || fileName,
    category: str(ctx.data.category) || "Other",
    file_path: path,
    file_name: fileName,
    mime_type: mimeType,
    size_bytes: numOrNull(bytes.byteLength),
    uploaded_by: caller.username,
  };
  const { data, error } = await ctx.svc.from("documents").insert(row).select("*").single();
  if (error) {
    // Roll back the stored object if the metadata insert fails.
    await ctx.svc.storage.from(BUCKET).remove([path]);
    throw new ApiError(error.message, 500);
  }
  return camelizeRow(data);
}

export async function deleteEmployeeDocument(ctx: Ctx) {
  requireAdmin(ctx.caller);
  const documentId = str(ctx.data.documentId);
  if (!documentId) throw new ApiError("documentId is required");

  const { data: doc, error: findErr } = await ctx.svc
    .from("documents").select("file_path").eq("document_id", documentId).maybeSingle();
  if (findErr) throw new ApiError(findErr.message, 500);
  if (!doc) throw new ApiError("Document not found", 404);

  if (doc.file_path) {
    await ctx.svc.storage.from(BUCKET).remove([doc.file_path as string]);
  }
  const { error } = await ctx.svc.from("documents").delete().eq("document_id", documentId);
  if (error) throw new ApiError(error.message, 500);
  return { deleted: true, documentId };
}
