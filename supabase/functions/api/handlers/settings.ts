import type { Ctx } from "../_shared/context.ts";
import { requireAdmin, requireCaller } from "../_shared/auth.ts";
import { ApiError } from "../_shared/errors.ts";
import { loadSettings } from "../_shared/settings.ts";

export async function getSettings(ctx: Ctx) {
  requireCaller(ctx.caller);
  // Returned as the flat { key: value } map the frontend expects.
  return await loadSettings(ctx.svc);
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
