import type { Ctx } from "../_shared/context.ts";
import { str } from "../_shared/context.ts";
import { bool } from "../_shared/settings.ts";
import { requireAdmin, requireCaller } from "../_shared/auth.ts";
import { ApiError } from "../_shared/errors.ts";
import { camelizeRow, camelizeRows } from "../_shared/case.ts";

export async function getHolidays(ctx: Ctx) {
  requireCaller(ctx.caller);
  const { data, error } = await ctx.svc
    .from("holidays").select("*").order("holiday_date", { ascending: true });
  if (error) throw new ApiError(error.message, 500);
  return camelizeRows(data);
}

export async function createHoliday(ctx: Ctx) {
  requireAdmin(ctx.caller);
  const row = {
    title: str(ctx.data.title),
    holiday_date: str(ctx.data.holidayDate),
    holiday_type: str(ctx.data.holidayType) || "Public",
  };
  if (!row.title || !row.holiday_date) throw new ApiError("title and holidayDate are required");
  const { data, error } = await ctx.svc.from("holidays").insert(row).select("*").single();
  if (error) throw new ApiError(error.message, 500);
  return camelizeRow(data);
}

export async function getSpecialWorkingDays(ctx: Ctx) {
  requireCaller(ctx.caller);
  const { data, error } = await ctx.svc
    .from("special_working_days").select("*").order("working_date", { ascending: true });
  if (error) throw new ApiError(error.message, 500);
  return camelizeRows(data);
}

export async function createSpecialWorkingDay(ctx: Ctx) {
  requireAdmin(ctx.caller);
  const row = {
    title: str(ctx.data.title),
    working_date: str(ctx.data.workingDate),
    all_employees: bool(ctx.data.allEmployees),
    assigned_employee_ids: str(ctx.data.assignedEmployeeIds) || null,
  };
  if (!row.title || !row.working_date) throw new ApiError("title and workingDate are required");
  const { data, error } = await ctx.svc.from("special_working_days").insert(row).select("*").single();
  if (error) throw new ApiError(error.message, 500);
  return camelizeRow(data);
}
