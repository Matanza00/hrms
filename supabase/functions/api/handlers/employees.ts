import type { Ctx } from "../_shared/context.ts";
import { str } from "../_shared/context.ts";
import { requireAdmin, requireCaller } from "../_shared/auth.ts";
import { ApiError } from "../_shared/errors.ts";
import { camelizeRow, camelizeRows, snakeizeObj } from "../_shared/case.ts";

// Columns an admin is allowed to set (protects generated/audit columns).
const WRITABLE = new Set([
  "employee_code", "name", "email", "phone", "cnic", "dob", "joining_date",
  "permanent_date", "end_date", "status", "department", "designation",
  "basic_salary", "fuel_allowance", "opd_allowance", "address",
  "emergency_contact", "active",
]);

function pickWritable(input: Record<string, unknown>): Record<string, unknown> {
  const snake = snakeizeObj(input);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(snake)) if (WRITABLE.has(k)) out[k] = v;
  return out;
}

export async function getEmployees(ctx: Ctx) {
  const caller = requireCaller(ctx.caller);
  // Admins see everyone; an employee only ever sees their own record.
  let q = ctx.svc.from("employees").select("*").order("name", { ascending: true });
  if (caller.role !== "Admin") q = q.eq("employee_id", caller.employeeId ?? "");
  const { data, error } = await q;
  if (error) throw new ApiError(error.message, 500);
  return camelizeRows(data);
}

export async function getEmployee(ctx: Ctx) {
  const caller = requireCaller(ctx.caller);
  const employeeId = str(ctx.data.employeeId);
  if (!employeeId) throw new ApiError("employeeId is required");
  if (caller.role !== "Admin" && caller.employeeId !== employeeId) {
    throw new ApiError("Not allowed", 403);
  }
  const { data, error } = await ctx.svc
    .from("employees").select("*").eq("employee_id", employeeId).maybeSingle();
  if (error) throw new ApiError(error.message, 500);
  if (!data) throw new ApiError("Employee not found", 404);
  return camelizeRow(data);
}

export async function createEmployee(ctx: Ctx) {
  requireAdmin(ctx.caller);
  const patch = pickWritable(ctx.data);
  if (!patch.employee_code) throw new ApiError("employeeCode is required");
  if (!patch.name) throw new ApiError("name is required");

  const { data, error } = await ctx.svc.from("employees").insert(patch).select("*").single();
  if (error) {
    if (error.code === "23505") throw new ApiError("An employee with that code already exists", 409);
    throw new ApiError(error.message, 500);
  }
  return camelizeRow(data);
}

export async function updateEmployee(ctx: Ctx) {
  requireAdmin(ctx.caller);
  const employeeId = str(ctx.data.employeeId);
  const payload = (ctx.data.data as Record<string, unknown>) ?? {};
  if (!employeeId) throw new ApiError("employeeId is required");

  const patch = pickWritable(payload);
  const { data, error } = await ctx.svc
    .from("employees").update(patch).eq("employee_id", employeeId).select("*").maybeSingle();
  if (error) throw new ApiError(error.message, 500);
  if (!data) throw new ApiError("Employee not found", 404);
  return camelizeRow(data);
}

export async function deactivateEmployee(ctx: Ctx) {
  requireAdmin(ctx.caller);
  const employeeId = str(ctx.data.employeeId);
  if (!employeeId) throw new ApiError("employeeId is required");

  const { data, error } = await ctx.svc
    .from("employees").update({ active: false }).eq("employee_id", employeeId).select("*").maybeSingle();
  if (error) throw new ApiError(error.message, 500);
  if (!data) throw new ApiError("Employee not found", 404);

  // Also disable any linked login so they can't authenticate.
  await ctx.svc.from("users").update({ active: false }).eq("employee_id", employeeId);
  return camelizeRow(data);
}
