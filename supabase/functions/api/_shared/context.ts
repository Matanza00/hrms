import type { SupabaseClient } from "@supabase/supabase-js";
import type { Caller } from "./auth.ts";

/** Everything a handler needs. `data` is the request payload in camelCase. */
export type Ctx = {
  svc: SupabaseClient;
  caller: Caller | null;
  data: Record<string, unknown>;
  req: Request;
};

export type Handler = (ctx: Ctx) => Promise<unknown> | unknown;

/** Coerce to a finite number or null (for optional lat/long/amounts). */
export function numOrNull(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function str(v: unknown): string {
  return v === undefined || v === null ? "" : String(v);
}
