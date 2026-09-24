import type { SupabaseClient } from "@supabase/supabase-js";
import type { SettingsMap } from "./settings.ts";
import { checkGeofence } from "./geofence.ts";

/**
 * Where the request really came from.
 *
 * Only ever read from the proxy headers, never from the request body: the
 * browser could claim any address it liked. `x-forwarded-for` is a chain of
 * hops, and the first entry is the client as the edge saw it.
 */
export function clientIp(req: Request): string {
  const chain = req.headers.get("x-forwarded-for") ?? "";
  const first = chain.split(",")[0]?.trim();
  return first || req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || "";
}

/**
 * May this employee mark attendance from here?
 *
 * Two independent proofs of being at the office, either of which is enough:
 *   - the device's position is inside the office radius (phones, which have GPS)
 *   - the request comes from one of the employee's registered networks
 *     (desktops, which have no GPS and are placed by a coarse network guess)
 *
 * Returns null when allowed, or the message to refuse with.
 */
export async function checkPresence(
  svc: SupabaseClient,
  employeeId: string,
  settings: SettingsMap,
  latitude: unknown,
  longitude: unknown,
  ip: string,
): Promise<string | null> {
  const geoErr = checkGeofence(settings, latitude, longitude);
  if (!geoErr) return null;

  if (ip) {
    const { data } = await svc
      .from("employee_ips")
      .select("ip_id")
      .eq("employee_id", employeeId)
      .eq("ip_address", ip)
      .maybeSingle();

    if (data) {
      await svc
        .from("employee_ips")
        .update({ last_used_at: new Date().toISOString() })
        .eq("ip_id", data.ip_id);
      return null;
    }
  }

  // Neither proof held. Say which network was seen, so an admin can register
  // the computer without having to go and look the address up.
  return ip ? `${geoErr} This computer's network (${ip}) is not registered for you.` : geoErr;
}
