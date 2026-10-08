import type { Ctx } from "../_shared/context.ts";
import { str } from "../_shared/context.ts";
import { requireAdmin, requireCaller } from "../_shared/auth.ts";
import { ApiError } from "../_shared/errors.ts";
import { withEmployeeName } from "../_shared/rows.ts";
import { clientIp, MIN_IPV4_PREFIX, normalizeNetwork, parseIpv4Block } from "../_shared/presence.ts";

/**
 * Accepts a plain IPv4 or IPv6 address, or an IPv4 block no wider than
 * MIN_IPV4_PREFIX ("119.73.96.0/24"). A block is what keeps an office reachable
 * when its ISP hands out a new address; the width limit is what stops a
 * mistyped one opening attendance to half the country.
 */
function validIp(value: string): boolean {
  if (value.includes("/")) return parseIpv4Block(value) !== null;

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
  if (!validIp(ip)) {
    // Say which of the two mistakes was made, since the fix differs.
    throw new ApiError(
      ip.includes("/")
        ? `"${ip}" is not a usable network block. Use a single address or a block no wider than /${MIN_IPV4_PREFIX}, such as 119.73.96.0/${MIN_IPV4_PREFIX}.`
        : `"${ip}" is not a valid IP address`,
    );
  }

  // Store the block masked down to the network it matches, so the list never
  // implies that the last number of "119.73.96.5/24" counts for anything.
  const stored = normalizeNetwork(ip);

  const { data, error } = await ctx.svc
    .from("employee_ips")
    .insert({ employee_id: employeeId, ip_address: stored, label: str(ctx.data.label) || null })
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
