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

/** Expand an IPv6 address to its eight groups, resolving "::" compression. */
function ipv6Groups(ip: string): string[] | null {
  const bare = ip.split("%")[0].toLowerCase();
  if (!bare.includes(":")) return null;

  const [head, tail] = bare.split("::");
  const left = head ? head.split(":").filter(Boolean) : [];
  const right = tail !== undefined && tail ? tail.split(":").filter(Boolean) : [];
  const groups = bare.includes("::")
    ? [...left, ...Array(Math.max(0, 8 - left.length - right.length)).fill("0"), ...right]
    : left;

  return groups.length === 8 ? groups.map((g) => g.replace(/^0+(?=.)/, "")) : null;
}

/**
 * Do two addresses mean "the same line"?
 *
 * IPv4 is compared whole: one address, one connection. IPv6 is compared on the
 * /64 prefix, because Windows and Android rotate the back half of an IPv6
 * address for privacy — the exact address a desktop shows today is gone
 * tomorrow, while the prefix belongs to the connection.
 */
export function sameNetwork(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;

  const ga = ipv6Groups(a);
  const gb = ipv6Groups(b);
  if (!ga || !gb) return false;
  return ga.slice(0, 4).join(":") === gb.slice(0, 4).join(":");
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
      .select("ip_id, ip_address")
      .eq("employee_id", employeeId);

    const match = (data ?? []).find((row) => sameNetwork(String(row.ip_address), ip));
    if (match) {
      await svc
        .from("employee_ips")
        .update({ last_used_at: new Date().toISOString() })
        .eq("ip_id", match.ip_id);
      return null;
    }
  }

  // Neither proof held. Say which network was seen, so an admin can register
  // the computer without having to go and look the address up.
  return ip ? `${geoErr} This computer's network (${ip}) is not registered for you.` : geoErr;
}
