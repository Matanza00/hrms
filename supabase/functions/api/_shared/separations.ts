import type { SupabaseClient } from "@supabase/supabase-js";
import { getBusinessDate } from "./businessDate.ts";
import { loadSettings, num } from "./settings.ts";

/** Today's business (shift) date, honouring the dayRolloverHour setting. */
export async function businessToday(svc: SupabaseClient): Promise<string> {
  const settings = await loadSettings(svc);
  return getBusinessDate(new Date(), num(settings.dayRolloverHour, 12));
}

/**
 * Deactivate employees whose approved separation's last working day is over
 * (optionally just one employee). Returns how many logins were disabled. Never
 * throws: a failure here must not take down the request that triggered it.
 */
export async function finalizeDueSeparations(
  svc: SupabaseClient,
  employeeId?: string | null,
): Promise<number> {
  try {
    const today = await businessToday(svc);
    const { data, error } = await svc.rpc("finalize_due_separations", {
      p_today: today,
      p_employee: employeeId ?? null,
    });
    if (error) throw error;
    return Number(data) || 0;
  } catch (err) {
    console.error("finalizeDueSeparations failed:", err);
    return 0;
  }
}
