import type { Ctx } from "../_shared/context.ts";
import { numOrNull, str } from "../_shared/context.ts";
import { requireAdmin, requireCaller, resolveActingEmployee } from "../_shared/auth.ts";
import { ApiError } from "../_shared/errors.ts";
import { withEmployeeName, withEmployeeNameOne } from "../_shared/rows.ts";

const SELECT = "*, employees(name)";

async function resolveEmployeeId(ctx: Ctx): Promise<string> {
  if (ctx.data.employeeId) return str(ctx.data.employeeId);
  if (ctx.data.employeeCode) {
    const { data } = await ctx.svc
      .from("employees").select("employee_id").eq("employee_code", str(ctx.data.employeeCode)).maybeSingle();
    if (!data) throw new ApiError("Employee not found", 404);
    return data.employee_id;
  }
  throw new ApiError("employeeId or employeeCode is required");
}

export async function getLeaveRequests(ctx: Ctx) {
  const caller = requireCaller(ctx.caller);
  let q = ctx.svc.from("leaves").select(SELECT).order("start_date", { ascending: false });
  if (caller.role !== "Admin") q = q.eq("employee_id", caller.employeeId ?? "");
  const { data, error } = await q;
  if (error) throw new ApiError(error.message, 500);
  return withEmployeeName(data);
}

export async function applyLeave(ctx: Ctx) {
  const caller = requireCaller(ctx.caller);
  const employee = await resolveActingEmployee(ctx.svc, caller, str(ctx.data.employeeCode));
  const row = {
    employee_id: employee.employee_id,
    leave_type: str(ctx.data.leaveType),
    start_date: str(ctx.data.startDate),
    end_date: str(ctx.data.endDate),
    total_days: numOrNull(ctx.data.totalDays) ?? 0,
    reason: str(ctx.data.reason) || null,
    status: "Pending",
  };
  if (!row.leave_type || !row.start_date || !row.end_date) {
    throw new ApiError("leaveType, startDate and endDate are required");
  }
  const { data, error } = await ctx.svc.from("leaves").insert(row).select(SELECT).single();
  if (error) throw new ApiError(error.message, 500);
  return withEmployeeNameOne(data);
}

/**
 * Approve a leave and split it into paid/unpaid days.
 * Reverse-engineered rule (verify): "Unpaid" leaves are fully unpaid; every
 * other type is treated as paid. Quota-aware splitting can be layered on later.
 */
export async function approveLeave(ctx: Ctx) {
  const caller = requireAdmin(ctx.caller);
  const leaveId = str(ctx.data.leaveId);
  if (!leaveId) throw new ApiError("leaveId is required");

  const { data: leave } = await ctx.svc.from("leaves").select("*").eq("leave_id", leaveId).maybeSingle();
  if (!leave) throw new ApiError("Leave not found", 404);

  const total = Number(leave.total_days) || 0;
  const isUnpaid = String(leave.leave_type).toLowerCase() === "unpaid";
  const paidDays = leave.paid_days ?? (isUnpaid ? 0 : total);
  const unpaidDays = leave.unpaid_days ?? (isUnpaid ? total : 0);

  const { data, error } = await ctx.svc
    .from("leaves")
    .update({
      status: "Approved",
      paid_days: paidDays,
      unpaid_days: unpaidDays,
      approved_by: str(ctx.data.approvedBy) || caller.username,
      approved_at: new Date().toISOString(),
    })
    .eq("leave_id", leaveId).select(SELECT).single();
  if (error) throw new ApiError(error.message, 500);
  return withEmployeeNameOne(data);
}

export async function rejectLeave(ctx: Ctx) {
  const caller = requireAdmin(ctx.caller);
  const leaveId = str(ctx.data.leaveId);
  if (!leaveId) throw new ApiError("leaveId is required");
  const { data, error } = await ctx.svc
    .from("leaves")
    .update({
      status: "Rejected",
      approved_by: str(ctx.data.approvedBy) || caller.username,
      approved_at: new Date().toISOString(),
    })
    .eq("leave_id", leaveId).select(SELECT).maybeSingle();
  if (error) throw new ApiError(error.message, 500);
  if (!data) throw new ApiError("Leave not found", 404);
  return withEmployeeNameOne(data);
}

export async function adminAddLeave(ctx: Ctx) {
  requireAdmin(ctx.caller);
  const employeeId = await resolveEmployeeId(ctx);
  const total = numOrNull(ctx.data.totalDays) ?? 0;
  const isUnpaid = str(ctx.data.leaveType).toLowerCase() === "unpaid";
  const row = {
    employee_id: employeeId,
    leave_type: str(ctx.data.leaveType),
    start_date: str(ctx.data.startDate),
    end_date: str(ctx.data.endDate),
    total_days: total,
    paid_days: numOrNull(ctx.data.paidDays) ?? (isUnpaid ? 0 : total),
    unpaid_days: numOrNull(ctx.data.unpaidDays) ?? (isUnpaid ? total : 0),
    status: str(ctx.data.status) || "Approved",
    reason: str(ctx.data.reason) || null,
    approved_by: "Admin (backfill)",
    approved_at: new Date().toISOString(),
  };
  const { data, error } = await ctx.svc.from("leaves").insert(row).select(SELECT).single();
  if (error) throw new ApiError(error.message, 500);
  return withEmployeeNameOne(data);
}

export async function adminUpdateLeave(ctx: Ctx) {
  requireAdmin(ctx.caller);
  const leaveId = str(ctx.data.leaveId);
  const fields = (ctx.data.data as Record<string, unknown>) ?? {};
  if (!leaveId) throw new ApiError("leaveId is required");

  const patch: Record<string, unknown> = {
    leave_type: fields.leaveType,
    start_date: fields.startDate,
    end_date: fields.endDate,
    total_days: fields.totalDays,
    paid_days: fields.paidDays,
    unpaid_days: fields.unpaidDays,
    status: fields.status,
    reason: fields.reason,
  };
  for (const k of Object.keys(patch)) if (patch[k] === undefined) delete patch[k];

  const { data, error } = await ctx.svc
    .from("leaves").update(patch).eq("leave_id", leaveId).select(SELECT).maybeSingle();
  if (error) throw new ApiError(error.message, 500);
  if (!data) throw new ApiError("Leave not found", 404);
  return withEmployeeNameOne(data);
}
