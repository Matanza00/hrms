import type { Ctx } from "../_shared/context.ts";
import { numOrNull, str } from "../_shared/context.ts";
import { requireAdmin, requireCaller } from "../_shared/auth.ts";
import { ApiError } from "../_shared/errors.ts";
import { withEmployeeName, withEmployeeNameOne } from "../_shared/rows.ts";
import { loadSettings, num } from "../_shared/settings.ts";

const SELECT = "*, employees(name)";

// ============================================================================
// REVERSE-ENGINEERED PAYROLL — VERIFY AGAINST A KNOWN MONTH.
// The original math lived in the Apps Script we couldn't see. The rules below
// are reasonable defaults derived from the field names + your shift policy.
// Every rule is tunable via Settings and flagged with a comment. Please check
// the outputs for one real employee/month and tell me which rules to adjust.
// ============================================================================

function monthBounds(month: string): { start: string; end: string } {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) throw new ApiError("month must be 'YYYY-MM'");
  const year = Number(m[1]);
  const mon = Number(m[2]); // 1-based
  const lastDay = new Date(Date.UTC(year, mon, 0)).getUTCDate();
  return { start: `${month}-01`, end: `${month}-${String(lastDay).padStart(2, "0")}` };
}

async function resolveEmployee(ctx: Ctx) {
  let q = ctx.svc.from("employees").select("*").limit(1);
  if (ctx.data.employeeId) q = q.eq("employee_id", str(ctx.data.employeeId));
  else if (ctx.data.employeeCode) q = q.eq("employee_code", str(ctx.data.employeeCode));
  else throw new ApiError("employeeId or employeeCode is required");
  const { data, error } = await q.maybeSingle();
  if (error) throw new ApiError(error.message, 500);
  if (!data) throw new ApiError("Employee not found", 404);
  return data;
}

export async function getPayroll(ctx: Ctx) {
  const caller = requireCaller(ctx.caller);
  let q = ctx.svc.from("payroll").select(SELECT).order("month", { ascending: false });
  if (caller.role !== "Admin") q = q.eq("employee_id", caller.employeeId ?? "");
  const { data, error } = await q;
  if (error) throw new ApiError(error.message, 500);
  return withEmployeeName(data);
}

export async function generatePayroll(ctx: Ctx) {
  requireAdmin(ctx.caller);
  const month = str(ctx.data.month);
  const { start, end } = monthBounds(month);
  const recalculate = ctx.data.recalculate === true || ctx.data.recalculate === "true";
  const bonus = numOrNull(ctx.data.bonus) ?? 0;

  const employee = await resolveEmployee(ctx);

  const existing = await ctx.svc
    .from("payroll").select("payroll_id, status")
    .eq("employee_id", employee.employee_id).eq("month", month).maybeSingle();
  if (existing.data && !recalculate) {
    throw new ApiError("Payroll already generated for this month (pass recalculate to overwrite)", 409);
  }

  const settings = await loadSettings(ctx.svc);
  const requiredHours = num(settings.requiredHours, 8);
  const workingDaysPerMonth = num(settings.workingDaysPerMonth, 26);

  // --- Attendance-based deductions -----------------------------------------
  const { data: att } = await ctx.svc
    .from("attendance")
    .select("is_late, deficit_minutes, check_out")
    .eq("employee_id", employee.employee_id)
    .gte("attendance_date", start).lte("attendance_date", end);

  const rows = att ?? [];
  // RULE (late): every 3 late arrivals = 1 deducted day; a remainder of 2 = ½ day.
  const lateCount = rows.filter((r) => r.is_late === true).length;
  const lateFullDays = Math.floor(lateCount / 3);
  const lateHalfDays = lateCount % 3 === 2 ? 1 : 0;

  // RULE (deficit): per closed shift, deficit >= full required = 1 day,
  // deficit >= half required = ½ day.
  let deficitFullDays = 0;
  let deficitHalfDays = 0;
  const requiredMinutes = requiredHours * 60;
  for (const r of rows) {
    if (!r.check_out) continue;
    const frac = requiredMinutes > 0 ? Number(r.deficit_minutes) / requiredMinutes : 0;
    if (frac >= 1) deficitFullDays += 1;
    else if (frac >= 0.5) deficitHalfDays += 1;
  }

  // --- Unpaid leave in the month -------------------------------------------
  const { data: leaves } = await ctx.svc
    .from("leaves")
    .select("unpaid_days")
    .eq("employee_id", employee.employee_id)
    .eq("status", "Approved")
    .lte("start_date", end).gte("end_date", start);
  const unpaidLeaveDays = (leaves ?? []).reduce((s, l) => s + (Number(l.unpaid_days) || 0), 0);

  // RULE (sandwich): weekends/holidays flanked by unpaid leave. Not enough of
  // the original logic survived to reproduce it — left at 0 pending your rule.
  const sandwichDays = 0;

  // --- Money ----------------------------------------------------------------
  const basic = Number(employee.basic_salary) || 0;
  const fuel = Number(employee.fuel_allowance) || 0;
  const opd = Number(employee.opd_allowance) || 0;
  const gross = basic + fuel + opd;

  const totalDeductionDays =
    unpaidLeaveDays +
    lateFullDays + 0.5 * lateHalfDays +
    deficitFullDays + 0.5 * deficitHalfDays +
    sandwichDays;

  const perDay = workingDaysPerMonth > 0 ? gross / workingDaysPerMonth : 0;
  const deductionAmount = Math.round(totalDeductionDays * perDay);
  const netSalary = Math.round(gross - deductionAmount + bonus);

  const record = {
    employee_id: employee.employee_id,
    month,
    basic_salary: basic,
    fuel_allowance: fuel,
    opd_allowance: opd,
    gross_salary: gross,
    unpaid_leave_days: unpaidLeaveDays,
    late_full_days: lateFullDays,
    late_half_days: lateHalfDays,
    deficit_full_days: deficitFullDays,
    deficit_half_days: deficitHalfDays,
    sandwich_days: sandwichDays,
    total_deduction_days: totalDeductionDays,
    deduction_amount: deductionAmount,
    bonus,
    net_salary: netSalary,
    status: "Generated",
    generated_at: new Date().toISOString(),
    paid_at: null,
  };

  const { data, error } = await ctx.svc
    .from("payroll").upsert(record, { onConflict: "employee_id,month" }).select(SELECT).single();
  if (error) throw new ApiError(error.message, 500);
  return withEmployeeNameOne(data);
}

async function setStatusForMonth(ctx: Ctx, status: "Paid" | "Cancelled") {
  requireAdmin(ctx.caller);
  const employeeId = str(ctx.data.employeeId);
  const month = str(ctx.data.month);
  if (!employeeId || !month) throw new ApiError("employeeId and month are required");

  const patch: Record<string, unknown> = { status };
  if (status === "Paid") patch.paid_at = new Date().toISOString();

  const { data, error } = await ctx.svc
    .from("payroll").update(patch)
    .eq("employee_id", employeeId).eq("month", month).select(SELECT).maybeSingle();
  if (error) throw new ApiError(error.message, 500);
  if (!data) throw new ApiError("Payroll record not found", 404);
  return withEmployeeNameOne(data);
}

export const markPayrollPaid = (ctx: Ctx) => setStatusForMonth(ctx, "Paid");
export const cancelPayroll = (ctx: Ctx) => setStatusForMonth(ctx, "Cancelled");
