import type { Ctx } from "../_shared/context.ts";
import { requireAdmin, requireCaller } from "../_shared/auth.ts";
import { ApiError } from "../_shared/errors.ts";
import { loadSettings } from "../_shared/settings.ts";

// Settings only an admin may read. The QR code is what proves someone stood at
// the office poster, so handing it to every employee would defeat the scan.
const ADMIN_ONLY_KEYS = ["attendanceQrCode"];

export async function getSettings(ctx: Ctx) {
  const caller = requireCaller(ctx.caller);
  // Returned as the flat { key: value } map the frontend expects.
  const map = await loadSettings(ctx.svc);
  if (caller.role !== "Admin") for (const key of ADMIN_ONLY_KEYS) delete map[key];
  return map;
}

export async function updateSettings(ctx: Ctx) {
  requireAdmin(ctx.caller);
  const entries = Object.entries(ctx.data ?? {});
  if (entries.length === 0) throw new ApiError("No settings provided");

  const rows = entries.map(([key, value]) => ({
    key,
    value: value === null || value === undefined ? "" : String(value),
  }));
  const { error } = await ctx.svc.from("settings").upsert(rows, { onConflict: "key" });
  if (error) throw new ApiError(error.message, 500);

  return await loadSettings(ctx.svc);
}
