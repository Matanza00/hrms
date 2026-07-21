import type { Ctx } from "../_shared/context.ts";
import { str } from "../_shared/context.ts";
import { requireAdmin, requireCaller } from "../_shared/auth.ts";
import { ApiError } from "../_shared/errors.ts";
import { camelizeRow, camelizeRows } from "../_shared/case.ts";

const BUCKET = "feedback-screenshots";

/** Save a base64 data URL to Storage and return its public URL (or ""). */
async function saveScreenshot(ctx: Ctx, dataUrl: string, feedbackId: string): Promise<string> {
  if (!dataUrl) return "";
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/.exec(dataUrl);
  if (!m) return "";
  try {
    const contentType = m[1];
    const ext = contentType.split("/")[1] || "png";
    const bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
    const path = `${feedbackId}.${ext}`;
    const { error } = await ctx.svc.storage.from(BUCKET).upload(path, bytes, {
      contentType,
      upsert: true,
    });
    if (error) return `SCREENSHOT_NOT_SAVED (${error.message})`;
    return ctx.svc.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  } catch (err) {
    return `SCREENSHOT_NOT_SAVED (${err instanceof Error ? err.message : String(err)})`;
  }
}

export async function submitFeedback(ctx: Ctx) {
  requireCaller(ctx.caller); // any logged-in user may file feedback
  const feedbackId = crypto.randomUUID();
  const screenshotUrl = await saveScreenshot(ctx, str(ctx.data.screenshot), feedbackId);

  const row = {
    feedback_id: feedbackId,
    type: str(ctx.data.type),
    reason: str(ctx.data.reason),
    page_path: str(ctx.data.pagePath),
    page_url: str(ctx.data.pageUrl),
    role: str(ctx.data.role),
    reporter_name: str(ctx.data.reporterName),
    reporter_email: str(ctx.data.reporterEmail),
    reporter_code: str(ctx.data.reporterCode),
    user_agent: str(ctx.data.userAgent),
    viewport: str(ctx.data.viewport),
    screenshot_url: screenshotUrl,
    status: "New",
  };
  const { data, error } = await ctx.svc.from("feedback").insert(row).select("*").single();
  if (error) throw new ApiError(error.message, 500);
  return camelizeRow(data);
}

export async function getFeedback(ctx: Ctx) {
  requireAdmin(ctx.caller);
  const { data, error } = await ctx.svc
    .from("feedback").select("*").order("created_at", { ascending: false });
  if (error) throw new ApiError(error.message, 500);
  return camelizeRows(data);
}

export async function updateFeedbackStatus(ctx: Ctx) {
  requireAdmin(ctx.caller);
  const feedbackId = str(ctx.data.feedbackId);
  const status = str(ctx.data.status);
  if (!feedbackId || !status) throw new ApiError("feedbackId and status are required");
  const { data, error } = await ctx.svc
    .from("feedback").update({ status }).eq("feedback_id", feedbackId).select("*").maybeSingle();
  if (error) throw new ApiError(error.message, 500);
  if (!data) throw new ApiError("Feedback not found", 404);
  return camelizeRow(data);
}
