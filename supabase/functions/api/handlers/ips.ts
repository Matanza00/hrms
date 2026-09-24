import type { Ctx } from "../_shared/context.ts";
import { str } from "../_shared/context.ts";
import { requireAdmin, requireCaller } from "../_shared/auth.ts";
import { ApiError } from "../_shared/errors.ts";
import { withEmployeeName } from "../_shared/rows.ts";
import { clientIp } from "../_shared/presence.ts";

/**
 * Accepts a plain IPv4 or IPv6 address. Ranges are deliberately not supported:
 * an admin typing a range by mistake would open attendance to a whole network.
 */
function validIp(value: string): boolean {
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const m = value.match(v4);
  if (m) return m.slice(1).every((n) => Number(n) >= 0 && Number(n) <= 255);
  // Loose IPv6: hex groups and colons, optionally compressed.
  return /^[0-9a-f:]+$/i.test(value) && value.includes(":") && value.length >= 3;
}

/** The address this request came from — what to register for this machine. */
export function whereAmI(ctx: Ctx) {
  requireCaller(ctx.caller);
  return { ip: clientIp(ctx.req) };
}

export async function getEmployeeIps(ctx: Ctx) {
  requireAdmin(ctx.caller);
  const { data, error } = await ctx.svc
    .from("employee_ips")
    .select("*, employees(name)")
    .order("created_at", { ascending: false });
  if (error) throw new ApiError(error.message, 500);
  return withEmployeeName(data ?? []);
}

export async function addEmployeeIp(ctx: Ctx) {
  requireAdmin(ctx.caller);
  const employeeId = str(ctx.data.employeeId);
  const ip = str(ctx.data.ipAddress).trim();
  if (!employeeId) throw new ApiError("employeeId is required");
  if (!ip) throw new ApiError("ipAddress is required");
  if (!validIp(ip)) throw new ApiError(`"${ip}" is not a valid IP address`);

  const { data, error } = await ctx.svc
    .from("employee_ips")
    .insert({ employee_id: employeeId, ip_address: ip, label: str(ctx.data.label) || null })
    .select("*, employees(name)")
    .single();

  if (error?.code === "23505") {
    throw new ApiError("That address is already registered for this employee", 409);
  }
  if (error) throw new ApiError(error.message, 500);
  return withEmployeeName([data])[0];
}

export async function removeEmployeeIp(ctx: Ctx) {
  requireAdmin(ctx.caller);
  const ipId = str(ctx.data.ipId);
  if (!ipId) throw new ApiError("ipId is required");

  const { error } = await ctx.svc.from("employee_ips").delete().eq("ip_id", ipId);
  if (error) throw new ApiError(error.message, 500);
  return { removed: true };
}
