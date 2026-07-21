import type { SupabaseClient } from "@supabase/supabase-js";
import type { Ctx } from "../_shared/context.ts";
import { numOrNull, str } from "../_shared/context.ts";
import { requireAdmin, requireCaller, resolveActingEmployee } from "../_shared/auth.ts";
import { ApiError } from "../_shared/errors.ts";
import { camelizeRow } from "../_shared/case.ts";
import { withEmployeeName, withEmployeeNameOne } from "../_shared/rows.ts";
import { loadSettings, num } from "../_shared/settings.ts";
import { checkGeofence } from "../_shared/geofence.ts";
import {
  computeWorkMinutes,
  getBusinessDate,
  getLateMinutes,
  isLate,
} from "../_shared/businessDate.ts";

const SELECT = "*, employees(name)";

async function getOpenAttendance(svc: SupabaseClient, employeeId: string) {
  // The still-open shift: latest row for this employee with no check-out. This
  // finds the previous-calendar-day row when someone checks out after midnight.
  const { data } = await svc
    .from("attendance")
    .select("*")
    .eq("employee_id", employeeId)
    .is("check_out", null)
    .order("attendance_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function getAttendance(ctx: Ctx) {
  const caller = requireCaller(ctx.caller);
  let q = ctx.svc.from("attendance").select(SELECT).order("attendance_date", { ascending: false });
  if (caller.role !== "Admin") q = q.eq("employee_id", caller.employeeId ?? "");
  const { data, error } = await q;
  if (error) throw new ApiError(error.message, 500);
  return withEmployeeName(data);
}

export async function checkIn(ctx: Ctx) {
  const caller = requireCaller(ctx.caller);
  const { svc } = ctx;
  const employee = await resolveActingEmployee(svc, caller, str(ctx.data.employeeCode));
  const settings = await loadSettings(svc);

  // 1) Geofence (honours toggle, tolerates GPS drift, fails open on misconfig).
  const geoErr = checkGeofence(settings, ctx.data.latitude, ctx.data.longitude);
  if (geoErr) throw new ApiError(geoErr, 422);

  // 2) Server time + business date of the overnight shift.
  const now = new Date();
  const rolloverHour = num(settings.dayRolloverHour, 12);
  const attendanceDate = getBusinessDate(now, rolloverHour);

  // 3) Holiday guard (weekend is informational only, mirroring the .gs).
  const { data: holiday } = await svc
    .from("holidays").select("holiday_id").eq("holiday_date", attendanceDate).maybeSingle();
  if (holiday) throw new ApiError("Today is a holiday", 422);

  const officeStart = settings.officeStartTime || settings.shiftStartTime || "18:00";
  const grace = num(settings.graceMinutes, 0);

  const row = {
    employee_id: employee.employee_id,
    attendance_date: attendanceDate,
    check_in: now.toISOString(),
    late_minutes: getLateMinutes(now, officeStart, grace),
    is_late: isLate(now, officeStart, grace),
    latitude: numOrNull(ctx.data.latitude),
    longitude: numOrNull(ctx.data.longitude),
    ip_address: str(ctx.data.ipAddress) || null,
    attendance_status: "Present",
  };

  const { data, error } = await svc.from("attendance").insert(row).select(SELECT).single();
  if (error) {
    // Unique(employee_id, attendance_date) violation == already checked in.
    if (error.code === "23505") {
      throw new ApiError(`Already checked in for this shift (${attendanceDate})`, 409);
    }
    throw new ApiError(error.message, 500);
  }
  return withEmployeeNameOne(data);
}

export async function breakStart(ctx: Ctx) {
  const caller = requireCaller(ctx.caller);
  const employee = await resolveActingEmployee(ctx.svc, caller, str(ctx.data.employeeCode));
  const open = await getOpenAttendance(ctx.svc, employee.employee_id);
  if (!open) throw new ApiError("No open shift to start a break on", 409);
  if (open.break_start) throw new ApiError("Break already started", 409);

  const { data, error } = await ctx.svc
    .from("attendance")
    .update({ break_start: new Date().toISOString() })
    .eq("attendance_id", open.attendance_id)
    .select(SELECT).single();
  if (error) throw new ApiError(error.message, 500);
  return withEmployeeNameOne(data);
}

export async function breakEnd(ctx: Ctx) {
  const caller = requireCaller(ctx.caller);
  const employee = await resolveActingEmployee(ctx.svc, caller, str(ctx.data.employeeCode));
  const open = await getOpenAttendance(ctx.svc, employee.employee_id);
  if (!open) throw new ApiError("No open shift to end a break on", 409);
  if (!open.break_start) throw new ApiError("Break was not started", 409);

  const now = new Date().toISOString();
  const settings = await loadSettings(ctx.svc);
  const derived = computeWorkMinutes(
    { checkIn: open.check_in, checkOut: open.check_out, breakStart: open.break_start, breakEnd: now },
    num(settings.requiredHours, 8),
  );

  const { data, error } = await ctx.svc
    .from("attendance")
    .update({ break_end: now, break_minutes: derived.breakMinutes })
    .eq("attendance_id", open.attendance_id)
    .select(SELECT).single();
  if (error) throw new ApiError(error.message, 500);
  return withEmployeeNameOne(data);
}

export async function checkOut(ctx: Ctx) {
  const caller = requireCaller(ctx.caller);
  const employee = await resolveActingEmployee(ctx.svc, caller, str(ctx.data.employeeCode));
  const open = await getOpenAttendance(ctx.svc, employee.employee_id);
  if (!open) throw new ApiError("No open shift to check out from", 409);

  const now = new Date().toISOString();
  const settings = await loadSettings(ctx.svc);
  const derived = computeWorkMinutes(
    { checkIn: open.check_in, checkOut: now, breakStart: open.break_start, breakEnd: open.break_end },
    num(settings.requiredHours, 8),
  );

  const { data, error } = await ctx.svc
    .from("attendance")
    .update({
      check_out: now,
      break_minutes: derived.breakMinutes,
      working_minutes: derived.workingMinutes,
      deficit_minutes: derived.deficitMinutes,
    })
    .eq("attendance_id", open.attendance_id)
    .select(SELECT).single();
  if (error) throw new ApiError(error.message, 500);
  return withEmployeeNameOne(data);
}

/* --------------------------- Correction requests --------------------------- */

export async function getAttendanceCorrections(ctx: Ctx) {
  const caller = requireCaller(ctx.caller);
  let q = ctx.svc.from("attendance_corrections").select(SELECT).order("created_at", { ascending: false });
  if (caller.role !== "Admin") q = q.eq("employee_id", caller.employeeId ?? "");
  const { data, error } = await q;
  if (error) throw new ApiError(error.message, 500);
  return withEmployeeName(data);
}

export async function requestAttendanceCorrection(ctx: Ctx) {
  const caller = requireCaller(ctx.caller);
  const employee = await resolveActingEmployee(ctx.svc, caller, str(ctx.data.employeeCode));
  const row = {
    employee_id: employee.employee_id,
    attendance_date: str(ctx.data.attendanceDate),
    request_type: str(ctx.data.requestType),
    old_value: str(ctx.data.oldValue) || null,
    new_value: str(ctx.data.newValue),
    reason: str(ctx.data.reason),
    status: "Pending",
  };
  if (!row.attendance_date || !row.request_type || !row.new_value) {
    throw new ApiError("attendanceDate, requestType and newValue are required");
  }
  const { data, error } = await ctx.svc
    .from("attendance_corrections").insert(row).select(SELECT).single();
  if (error) throw new ApiError(error.message, 500);
  return withEmployeeNameOne(data);
}

export async function approveAttendanceCorrection(ctx: Ctx) {
  const caller = requireAdmin(ctx.caller);
  const correctionId = str(ctx.data.correctionId);
  if (!correctionId) throw new ApiError("correctionId is required");
  const { data, error } = await ctx.svc
    .from("attendance_corrections")
    .update({
      status: "Approved",
      approved_by: str(ctx.data.approvedBy) || caller.username,
      approved_at: new Date().toISOString(),
    })
    .eq("correction_id", correctionId)
    .select(SELECT).maybeSingle();
  if (error) throw new ApiError(error.message, 500);
  if (!data) throw new ApiError("Correction not found", 404);
  // NOTE: this marks the request approved. Applying the change to the attendance
  // row itself is done via adminUpdateAttendance (kept explicit on purpose).
  return withEmployeeNameOne(data);
}

/* ------------------------------ Admin edits ------------------------------- */

async function derivedPatch(svc: SupabaseClient, fields: Record<string, unknown>) {
  const settings = await loadSettings(svc);
  const requiredHours = num(settings.requiredHours, 8);
  const officeStart = settings.officeStartTime || settings.shiftStartTime || "18:00";
  const grace = num(settings.graceMinutes, 0);
  const work = computeWorkMinutes(fields, requiredHours);
  const late = fields.checkIn
    ? {
        late_minutes: getLateMinutes(new Date(fields.checkIn as string), officeStart, grace),
        is_late: isLate(new Date(fields.checkIn as string), officeStart, grace),
      }
    : {};
  return {
    break_minutes: work.breakMinutes,
    working_minutes: work.workingMinutes,
    deficit_minutes: work.deficitMinutes,
    ...late,
  };
}

export async function adminUpdateAttendance(ctx: Ctx) {
  requireAdmin(ctx.caller);
  const attendanceId = str(ctx.data.attendanceId);
  const fields = (ctx.data.data as Record<string, unknown>) ?? {};
  if (!attendanceId) throw new ApiError("attendanceId is required");

  const patch = {
    attendance_date: fields.attendanceDate,
    check_in: fields.checkIn || null,
    check_out: fields.checkOut || null,
    break_start: fields.breakStart || null,
    break_end: fields.breakEnd || null,
    attendance_status: fields.attendanceStatus,
    ...(await derivedPatch(ctx.svc, fields)),
  };
  const { data, error } = await ctx.svc
    .from("attendance").update(patch).eq("attendance_id", attendanceId).select(SELECT).maybeSingle();
  if (error) throw new ApiError(error.message, 500);
  if (!data) throw new ApiError("Attendance record not found", 404);
  return withEmployeeNameOne(data);
}

export async function adminCreateAttendance(ctx: Ctx) {
  requireAdmin(ctx.caller);
  const fields = ctx.data;

  // Resolve employee_id from either employeeId or employeeCode.
  let employeeId = str(fields.employeeId);
  if (!employeeId && fields.employeeCode) {
    const { data: emp } = await ctx.svc
      .from("employees").select("employee_id").eq("employee_code", str(fields.employeeCode)).maybeSingle();
    if (!emp) throw new ApiError("Employee not found", 404);
    employeeId = emp.employee_id;
  }
  if (!employeeId) throw new ApiError("employeeId or employeeCode is required");
  if (!fields.attendanceDate) throw new ApiError("attendanceDate is required");

  const row = {
    employee_id: employeeId,
    attendance_date: str(fields.attendanceDate),
    check_in: fields.checkIn || null,
    check_out: fields.checkOut || null,
    break_start: fields.breakStart || null,
    break_end: fields.breakEnd || null,
    attendance_status: str(fields.attendanceStatus) || "Present",
    ...(await derivedPatch(ctx.svc, fields)),
  };
  const { data, error } = await ctx.svc.from("attendance").insert(row).select(SELECT).single();
  if (error) {
    if (error.code === "23505") throw new ApiError("An attendance row for that employee/date already exists", 409);
    throw new ApiError(error.message, 500);
  }
  return withEmployeeNameOne(data);
}
