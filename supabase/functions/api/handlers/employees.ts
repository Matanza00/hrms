import type { SupabaseClient } from "@supabase/supabase-js";
import type { Ctx } from "../_shared/context.ts";
import { str } from "../_shared/context.ts";
import { authEmailFor, requireAdmin, requireCaller } from "../_shared/auth.ts";
import { ApiError } from "../_shared/errors.ts";
import { camelizeRow, camelizeRows, snakeizeObj } from "../_shared/case.ts";

// Columns an admin is allowed to set (protects generated/audit columns).
const WRITABLE = new Set([
  "employee_code", "name", "email", "phone", "cnic", "dob", "joining_date",
  "permanent_date", "end_date", "status", "department", "designation",
  "basic_salary", "fuel_allowance", "opd_allowance", "address",
  "emergency_contact", "active",
]);

// Blank date inputs arrive as "", which Postgres rejects for a date column.
const DATE_COLUMNS = new Set(["dob", "joining_date", "permanent_date", "end_date"]);

function pickWritable(input: Record<string, unknown>): Record<string, unknown> {
  const snake = snakeizeObj(input);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(snake)) {
    if (!WRITABLE.has(k)) continue;
    out[k] = DATE_COLUMNS.has(k) && v === "" ? null : v;
  }
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

  await createEmployeeLogin(ctx.svc, data.employee_id, String(data.employee_code));
  return camelizeRow(data);
}

// Every employee added from the app gets a login straight away: the Login ID
// is their employee code and this is their password.
const DEFAULT_EMPLOYEE_PASSWORD = "admin12345";

/**
 * Create the Auth user + profile row for a new employee. If that fails, the
 * employee row is removed again so the admin can simply retry the save.
 */
async function createEmployeeLogin(svc: SupabaseClient, employeeId: string, code: string) {
  const { data: created, error: authErr } = await svc.auth.admin.createUser({
    email: authEmailFor(code),
    password: DEFAULT_EMPLOYEE_PASSWORD,
    email_confirm: true,
  });

  let failure = authErr?.message;
  if (!authErr && created.user) {
    const { error: profileErr } = await svc.from("users").insert({
      id: created.user.id,
      username: code,
      role: "Employee",
      employee_id: employeeId,
      active: true,
    });
    if (!profileErr) return;
    failure = profileErr.message;
    await svc.auth.admin.deleteUser(created.user.id);
  }

  await svc.from("employees").delete().eq("employee_id", employeeId);
  throw new ApiError(`Employee not saved: could not create their login (${failure})`, 500);
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

  // Keep the linked login in step: someone who has left LDS can't sign in,
  // and undoing that restores their access.
  if (typeof patch.active === "boolean") {
    await ctx.svc.from("users").update({ active: patch.active }).eq("employee_id", employeeId);
  }
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
