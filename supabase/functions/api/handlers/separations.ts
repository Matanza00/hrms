import type { Ctx } from "../_shared/context.ts";
import { str } from "../_shared/context.ts";
import { requireAdmin, requireCaller } from "../_shared/auth.ts";
import { ApiError } from "../_shared/errors.ts";
import { withEmployeeName, withEmployeeNameOne } from "../_shared/rows.ts";
import { businessToday, finalizeDueSeparations } from "../_shared/separations.ts";

// Resignations and terminations. A separation is Approved with a last working
// day; the employee serves notice ('Notice Period') until then, and
// finalizeDueSeparations deactivates them once it has passed.

const SELECT = "*, employees(name)";
const TYPES = new Set(["Resignation", "Termination"]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function dateOrThrow(value: unknown, label: string): string {
  const s = str(value).slice(0, 10);
  if (!DATE_RE.test(s)) throw new ApiError(`${label} is required (YYYY-MM-DD)`);
  return s;
}

/** Put the employee on notice until the last working day. */
async function startNotice(ctx: Ctx, employeeId: string, lastWorkingDay: string) {
  const { error } = await ctx.svc
    .from("employees")
    .update({ status: "Notice Period", end_date: lastWorkingDay })
    .eq("employee_id", employeeId);
  if (error) throw new ApiError(error.message, 500);
}

async function employeeStatus(ctx: Ctx, employeeId: string): Promise<string> {
  const { data, error } = await ctx.svc
    .from("employees")
    .select("status, active")
    .eq("employee_id", employeeId)
    .maybeSingle();
  if (error) throw new ApiError(error.message, 500);
  if (!data) throw new ApiError("Employee not found", 404);
  if (data.active === false) throw new ApiError("This employee has already left", 409);
  return String(data.status ?? "");
}

async function loadSeparation(ctx: Ctx, separationId: string) {
  const { data, error } = await ctx.svc
    .from("separations")
    .select("*")
    .eq("separation_id", separationId)
    .maybeSingle();
  if (error) throw new ApiError(error.message, 500);
  if (!data) throw new ApiError("Separation not found", 404);
  return data;
}

function openConflict(err: { code?: string; message: string }): never {
  if (err.code === "23505") {
    throw new ApiError("This employee already has a resignation or termination in progress", 409);
  }
  throw new ApiError(err.message, 500);
}

/** Admin: all separations (or one employee's), newest first. */
export async function getSeparations(ctx: Ctx) {
  requireAdmin(ctx.caller);
  await finalizeDueSeparations(ctx.svc);
  let q = ctx.svc.from("separations").select(SELECT).order("created_at", { ascending: false });
  const employeeId = str(ctx.data.employeeId);
  if (employeeId) q = q.eq("employee_id", employeeId);
  const { data, error } = await q;
  if (error) throw new ApiError(error.message, 500);
  return withEmployeeName(data);
}

/** Employee: their own latest separation, if any. */
export async function getMySeparation(ctx: Ctx) {
  const caller = requireCaller(ctx.caller);
  if (!caller.employeeId) return null;
  const { data, error } = await ctx.svc
    .from("separations")
    .select(SELECT)
    .eq("employee_id", caller.employeeId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new ApiError(error.message, 500);
  return withEmployeeNameOne(data);
}

/** Employee hands in their resignation; an admin accepts or rejects it. */
export async function submitResignation(ctx: Ctx) {
  const caller = requireCaller(ctx.caller);
  if (caller.role !== "Employee" || !caller.employeeId) {
    throw new ApiError("Only employees can submit a resignation", 403);
  }
  const reason = str(ctx.data.reason).trim();
  if (!reason) throw new ApiError("Please give a reason");
  const today = await businessToday(ctx.svc);
  const requestedLastDay = dateOrThrow(ctx.data.requestedLastDay, "Proposed last working day");
  if (requestedLastDay < today)
    throw new ApiError("Proposed last working day can't be in the past");

  const previousStatus = await employeeStatus(ctx, caller.employeeId);
  const { data, error } = await ctx.svc
    .from("separations")
    .insert({
      employee_id: caller.employeeId,
      type: "Resignation",
      status: "Pending",
      reason,
      notice_date: today,
      requested_last_day: requestedLastDay,
      previous_status: previousStatus,
      created_by: caller.username,
    })
    .select(SELECT)
    .single();
  if (error) openConflict(error);
  return withEmployeeNameOne(data);
}

/** Admin records a resignation or termination directly (already accepted). */
export async function recordSeparation(ctx: Ctx) {
  const caller = requireAdmin(ctx.caller);
  const employeeId = str(ctx.data.employeeId);
  const type = str(ctx.data.type);
  if (!employeeId) throw new ApiError("employeeId is required");
  if (!TYPES.has(type)) throw new ApiError("type must be Resignation or Termination");
  const noticeDate = dateOrThrow(ctx.data.noticeDate, "Notice date");
  const lastWorkingDay = dateOrThrow(ctx.data.lastWorkingDay, "Last working day");
  if (lastWorkingDay < noticeDate) {
    throw new ApiError("Last working day can't be before the notice date");
  }

  const previousStatus = await employeeStatus(ctx, employeeId);
  const now = new Date().toISOString();
  const { data, error } = await ctx.svc
    .from("separations")
    .insert({
      employee_id: employeeId,
      type,
      status: "Approved",
      reason: str(ctx.data.reason).trim() || null,
      admin_note: str(ctx.data.note).trim() || null,
      notice_date: noticeDate,
      last_working_day: lastWorkingDay,
      previous_status: previousStatus,
      created_by: caller.username,
      decided_by: caller.username,
      decided_at: now,
    })
    .select(SELECT)
    .single();
  if (error) openConflict(error);

  await startNotice(ctx, employeeId, lastWorkingDay);
  // A last working day already in the past takes effect straight away.
  await finalizeDueSeparations(ctx.svc, employeeId);
  return withEmployeeNameOne(data);
}

/** Admin accepts (with a last working day) or rejects a pending resignation. */
export async function decideResignation(ctx: Ctx) {
  const caller = requireAdmin(ctx.caller);
  const separationId = str(ctx.data.separationId);
  const decision = str(ctx.data.decision);
  if (!separationId) throw new ApiError("separationId is required");
  if (decision !== "approve" && decision !== "reject") {
    throw new ApiError("decision must be approve or reject");
  }

  const sep = await loadSeparation(ctx, separationId);
  if (sep.status !== "Pending")
    throw new ApiError("This resignation has already been decided", 409);

  const patch: Record<string, unknown> = {
    status: decision === "approve" ? "Approved" : "Rejected",
    admin_note: str(ctx.data.note).trim() || null,
    decided_by: caller.username,
    decided_at: new Date().toISOString(),
  };
  if (decision === "approve") {
    const lastWorkingDay = dateOrThrow(ctx.data.lastWorkingDay, "Last working day");
    if (lastWorkingDay < String(sep.notice_date)) {
      throw new ApiError("Last working day can't be before the notice date");
    }
    patch.last_working_day = lastWorkingDay;
  }

  const { data, error } = await ctx.svc
    .from("separations")
    .update(patch)
    .eq("separation_id", separationId)
    .eq("status", "Pending")
    .select(SELECT)
    .maybeSingle();
  if (error) throw new ApiError(error.message, 500);
  if (!data) throw new ApiError("This resignation has already been decided", 409);

  if (decision === "approve") {
    await startNotice(ctx, String(sep.employee_id), String(patch.last_working_day));
    await finalizeDueSeparations(ctx.svc, String(sep.employee_id));
  }
  return withEmployeeNameOne(data);
}

/**
 * Admin cancels a pending or approved separation before the last working day
 * passes (resignation withdrawn, decision reversed). The employee's previous
 * employment status comes back and the end date is cleared.
 */
export async function cancelSeparation(ctx: Ctx) {
  const caller = requireAdmin(ctx.caller);
  const separationId = str(ctx.data.separationId);
  if (!separationId) throw new ApiError("separationId is required");

  // Finalize first so a notice period that has already ended can't be undone here.
  const sep0 = await loadSeparation(ctx, separationId);
  await finalizeDueSeparations(ctx.svc, String(sep0.employee_id));
  const sep = await loadSeparation(ctx, separationId);
  if (sep.status !== "Pending" && sep.status !== "Approved") {
    throw new ApiError(
      sep.status === "Completed"
        ? "The last working day has passed. To bring them back, edit the employee and turn off 'Has left LDS'."
        : "This separation is already closed",
      409,
    );
  }

  const { data, error } = await ctx.svc
    .from("separations")
    .update({
      status: "Cancelled",
      admin_note: str(ctx.data.note).trim() || sep.admin_note || null,
      decided_by: caller.username,
      decided_at: new Date().toISOString(),
    })
    .eq("separation_id", separationId)
    .in("status", ["Pending", "Approved"])
    .select(SELECT)
    .maybeSingle();
  if (error) throw new ApiError(error.message, 500);
  if (!data) throw new ApiError("This separation is already closed", 409);

  if (sep.status === "Approved") {
    const { error: empErr } = await ctx.svc
      .from("employees")
      .update({ status: sep.previous_status || "Permanent", end_date: null })
      .eq("employee_id", sep.employee_id);
    if (empErr) throw new ApiError(empErr.message, 500);
  }
  return withEmployeeNameOne(data);
}
