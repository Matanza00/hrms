import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "./errors.ts";

export type SettingsMap = Record<string, string>;

/** Load the key/value settings sheet into a flat map. */
export async function loadSettings(svc: SupabaseClient): Promise<SettingsMap> {
  const { data, error } = await svc.from("settings").select("key, value");
  if (error) throw new ApiError(error.message, 500);
  const map: SettingsMap = {};
  for (const row of data ?? []) map[row.key as string] = (row.value as string) ?? "";
  return map;
}

export function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function bool(v: unknown): boolean {
  if (v === true) return true;
  return ["true", "1", "yes", "on"].includes(String(v ?? "").trim().toLowerCase());
}
