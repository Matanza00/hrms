import type { SupabaseClient } from "@supabase/supabase-js";
import type { Ctx } from "../_shared/context.ts";
import { str } from "../_shared/context.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { ApiError } from "../_shared/errors.ts";
import { withEmployeeName } from "../_shared/rows.ts";

const SELECT = "*, employees(name)";

export type DeviceRow = {
  device_id: string;
  employee_id: string;
  device_token: string;
  active: boolean;
};

export type DeviceCheck = { known: DeviceRow | null; willRegister: boolean };

/**
 * May this phone mark attendance for this employee? Their registered phone may;
 * so may any phone when they have none yet (first scan, or the first after an
 * admin reset). Every other phone is refused — that binding is what stops a
 * colleague marking someone else's attendance.
 *
 * Checking and recording are separate so that a scan which marks nothing (a
 * holiday, an already-finished shift) does not register a phone. Pair with
 * commitDevice once the attendance row is written.
 */
export async function assertDeviceAllowed(
  svc: SupabaseClient,
  employeeId: string,
  token: string,
): Promise<DeviceCheck> {
  const { data: known } = await svc
    .from("employee_devices").select("*").eq("device_token", token).maybeSingle();

  if (known && known.employee_id !== employeeId) {
    throw new ApiError("This phone is already registered to another employee.", 403);
  }
  if (known?.active) return { known: known as DeviceRow, willRegister: false };

  const { data: current } = await svc
    .from("employee_devices")
    .select("device_id").eq("employee_id", employeeId).eq("active", true).maybeSingle();
  if (current) {
    throw new ApiError(
      "Attendance is tied to your registered phone. Ask an admin to reset it if you changed phones.",
      403,
    );
  }

  return { known: (known as DeviceRow) ?? null, willRegister: true };
}

/** Record the scan against the phone, registering it on the employee's first. */
export async function commitDevice(
  svc: SupabaseClient,
  employeeId: string,
  token: string,
  label: string,
  check: DeviceCheck,
): Promise<boolean> {
  const now = new Date().toISOString();

  if (!check.willRegister && check.known) {
    await svc
      .from("employee_devices")
      .update({ last_seen_at: now, label: label || null })
      .eq("device_id", check.known.device_id);
    return false;
  }

  const patch = {
    employee_id: employeeId,
    device_token: token,
    label: label || null,
    active: true,
    registered_at: now,
    last_seen_at: now,
    revoked_at: null,
  };

  const { error } = check.known
    ? await svc.from("employee_devices").update(patch).eq("device_id", check.known.device_id)
    : await svc.from("employee_devices").insert(patch);

  // Unique(employee_id) where active: another phone won the race.
  if (error?.code === "23505") {
    throw new ApiError("Another phone was just registered to you. Ask an admin to reset it.", 409);
  }
  if (error) throw new ApiError(error.message, 500);
  return true;
}

/* ------------------------------- Admin views ------------------------------ */

export async function getEmployeeDevices(ctx: Ctx) {
  requireAdmin(ctx.caller);
  const { data, error } = await ctx.svc
    .from("employee_devices")
    .select(SELECT)
    .eq("active", true)
    .order("registered_at", { ascending: false });
  if (error) throw new ApiError(error.message, 500);
  // device_token is a secret the phone proves itself with — never send it out.
  const rows = (data ?? []).map(({ device_token: _token, ...rest }) => rest);
  return withEmployeeName(rows);
}

/** Unbind an employee's phone so their next scan registers a new one. */
export async function resetEmployeeDevice(ctx: Ctx) {
  requireAdmin(ctx.caller);
  const employeeId = str(ctx.data.employeeId);
  if (!employeeId) throw new ApiError("employeeId is required");

  const { data, error } = await ctx.svc
    .from("employee_devices")
    .update({ active: false, revoked_at: new Date().toISOString() })
    .eq("employee_id", employeeId)
    .eq("active", true)
    .select("device_id");
  if (error) throw new ApiError(error.message, 500);
  return { reset: (data ?? []).length };
}

/* ------------------------------ The QR poster ----------------------------- */

export async function getAttendanceQr(ctx: Ctx) {
  requireAdmin(ctx.caller);
  const { data, error } = await ctx.svc
    .from("settings").select("value").eq("key", "attendanceQrCode").maybeSingle();
  if (error) throw new ApiError(error.message, 500);
  return { code: (data?.value as string) ?? "" };
}

/** Issue a new code. Every printed poster with the old code stops working. */
export async function rotateAttendanceQr(ctx: Ctx) {
  requireAdmin(ctx.caller);
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const code = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

  const { error } = await ctx.svc
    .from("settings").upsert({ key: "attendanceQrCode", value: code }, { onConflict: "key" });
  if (error) throw new ApiError(error.message, 500);
  return { code };
}
