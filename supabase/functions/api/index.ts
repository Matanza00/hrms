// LDS HRMS API — a single action-router Edge Function that replaces the Google
// Apps Script web app. It keeps the exact { action, data } -> { success, data }
// contract the React app already speaks, so the frontend only changes its base
// URL. Each action enforces its own authorization via the _shared/auth helpers.
import { preflight } from "./_shared/cors.ts";
import { jsonError, jsonSuccess } from "./_shared/response.ts";
import { ApiError } from "./_shared/errors.ts";
import { serviceClient } from "./_shared/supabase.ts";
import { resolveCaller } from "./_shared/auth.ts";
import type { Ctx, Handler } from "./_shared/context.ts";

import * as auth from "./handlers/auth.ts";
import * as employees from "./handlers/employees.ts";
import * as attendance from "./handlers/attendance.ts";
import * as devices from "./handlers/devices.ts";
import * as leaves from "./handlers/leaves.ts";
import * as calendar from "./handlers/calendar.ts";
import * as settings from "./handlers/settings.ts";
import * as payroll from "./handlers/payroll.ts";
import * as accounts from "./handlers/accounts.ts";
import * as feedback from "./handlers/feedback.ts";

// action name (as the frontend sends it) -> handler
const routes: Record<string, Handler> = {
  // auth
  login: auth.login,
  me: auth.me,
  changePassword: auth.changePassword,

  // employees
  employees: employees.getEmployees,
  employee: employees.getEmployee,
  createEmployee: employees.createEmployee,
  updateEmployee: employees.updateEmployee,
  deactivateEmployee: employees.deactivateEmployee,

  // attendance
  attendance: attendance.getAttendance,
  checkIn: attendance.checkIn,
  breakStart: attendance.breakStart,
  breakEnd: attendance.breakEnd,
  checkOut: attendance.checkOut,
  attendanceCorrections: attendance.getAttendanceCorrections,
  requestAttendanceCorrection: attendance.requestAttendanceCorrection,
  approveAttendanceCorrection: attendance.approveAttendanceCorrection,
  adminUpdateAttendance: attendance.adminUpdateAttendance,
  adminCreateAttendance: attendance.adminCreateAttendance,

  // QR attendance + registered phones
  scanAttendance: attendance.scanAttendance,
  employeeDevices: devices.getEmployeeDevices,
  resetEmployeeDevice: devices.resetEmployeeDevice,
  attendanceQr: devices.getAttendanceQr,
  rotateAttendanceQr: devices.rotateAttendanceQr,

  // leaves
  leaveRequests: leaves.getLeaveRequests,
  applyLeave: leaves.applyLeave,
  approveLeave: leaves.approveLeave,
  rejectLeave: leaves.rejectLeave,
  adminAddLeave: leaves.adminAddLeave,
  adminUpdateLeave: leaves.adminUpdateLeave,

  // calendar
  holidays: calendar.getHolidays,
  createHoliday: calendar.createHoliday,
  specialWorkingDays: calendar.getSpecialWorkingDays,
  createSpecialWorkingDay: calendar.createSpecialWorkingDay,

  // settings
  settings: settings.getSettings,
  updateSettings: settings.updateSettings,

  // payroll
  payroll: payroll.getPayroll,
  generatePayroll: payroll.generatePayroll,
  markPayrollPaid: payroll.markPayrollPaid,
  cancelPayroll: payroll.cancelPayroll,

  // accounts
  revenue: accounts.getRevenue,
  createRevenue: accounts.createRevenue,
  expenses: accounts.getExpenses,
  createExpense: accounts.createExpense,
  reserveLedger: accounts.getReserveLedger,
  accountsOverview: accounts.getAccountsOverview,

  // feedback
  feedback: feedback.getFeedback,
  submitFeedback: feedback.submitFeedback,
  updateFeedbackStatus: feedback.updateFeedbackStatus,
};

async function parseRequest(req: Request): Promise<{ action: string; data: Record<string, unknown> }> {
  if (req.method === "GET") {
    const url = new URL(req.url);
    const data: Record<string, unknown> = {};
    for (const [k, v] of url.searchParams.entries()) if (k !== "action") data[k] = v;
    return { action: url.searchParams.get("action") ?? "", data };
  }
  const text = await req.text();
  let body: { action?: string; data?: unknown } = {};
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      throw new ApiError("Invalid JSON body");
    }
  }
  return { action: body.action ?? "", data: (body.data as Record<string, unknown>) ?? {} };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return preflight();

  try {
    const { action, data } = await parseRequest(req);
    if (!action) throw new ApiError("Missing 'action'");

    const handler = routes[action];
    if (!handler) throw new ApiError(`Unknown action: ${action}`, 404);

    const svc = serviceClient();
    // login is public; every other handler enforces its own auth level. Caller
    // may be null here (resolved from the Authorization header only).
    const caller = action === "login" ? null : await resolveCaller(req);

    const ctx: Ctx = { svc, caller, data, req };
    const result = await handler(ctx);
    return jsonSuccess(result);
  } catch (err) {
    if (err instanceof ApiError) return jsonError(err.message, err.status);
    console.error("Unhandled error:", err);
    const message = err instanceof Error ? err.message : "Internal error";
    return jsonError(message, 500);
  }
});
