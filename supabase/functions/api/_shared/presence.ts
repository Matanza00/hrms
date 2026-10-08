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

/** The 32 bits of an IPv4 address, or null when it is not one. */
function ipv4ToInt(ip: string): number | null {
  const parts = ip.trim().split(".");
  if (parts.length !== 4) return null;

  let bits = 0;
  for (const part of parts) {
    if (!/^[0-9]{1,3}$/.test(part)) return null;
    const n = Number(part);
    if (n > 255) return null;
    bits = ((bits << 8) >>> 0) + n;
  }
  return bits >>> 0;
}

/** Those 32 bits back as text. */
function ipv4ToText(bits: number): string {
  return [24, 16, 8, 0].map((shift) => (bits >>> shift) & 255).join(".");
}

/**
 * The narrowest block an admin may register. An ISP hands the office a new
 * address from its pool every time the router reconnects — only the last number
 * changes — so a /24 follows the office while staying one street wide. Anything
 * wider is refused: a /16 would hand attendance to sixty thousand addresses,
 * which is never what someone means to type.
 */
export const MIN_IPV4_PREFIX = 24;

/**
 * Read "119.73.96.0/24" as the network it describes. Returns null for anything
 * that is not an IPv4 block within the allowed width.
 */
export function parseIpv4Block(value: string): {
  network: number;
  mask: number;
  bits: number;
} | null {
  const parts = value.trim().split("/");
  if (parts.length !== 2) return null;
  const bits = Number(parts[1]);
  if (!Number.isInteger(bits) || bits < MIN_IPV4_PREFIX || bits > 32) return null;
  const addr = ipv4ToInt(parts[0]);
  if (addr === null) return null;
  const mask = (0xffffffff << (32 - bits)) >>> 0;
  return { network: (addr & mask) >>> 0, mask, bits };
}

/**
 * Canonical text for a registered address: a block is masked down to the
 * network it really matches, so "119.73.96.5/24" is stored and shown as
 * "119.73.96.0/24" rather than implying the .5 matters.
 */
export function normalizeNetwork(value: string): string {
  const trimmed = value.trim();
  const block = parseIpv4Block(trimmed);
  if (!block) return trimmed;
  return `${ipv4ToText(block.network)}/${block.bits}`;
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
 * Does the address we saw fall under what was registered?
 *
 * `allowed` is the registered entry and `seen` is the address the request
 * actually arrived from, so only the registered side may name a block.
 *
 * A bare IPv4 address is compared whole: one address, one connection. A
 * registered block covers its whole range, which is how the office survives its
 * ISP handing out a new address. IPv6 is compared on the /64 prefix, because
 * Windows and Android rotate the back half of an IPv6 address for privacy — the
 * exact address a desktop shows today is gone tomorrow, while the prefix
 * belongs to the connection.
 */
export function sameNetwork(allowed: string, seen: string): boolean {
  if (!allowed || !seen) return false;

  const block = parseIpv4Block(allowed);
  if (block) {
    const addr = ipv4ToInt(seen);
    return addr !== null && ((addr & block.mask) >>> 0) === block.network;
  }
  if (allowed.includes("/")) return false; // a malformed or too-wide block matches nothing

  if (allowed === seen) return true;

  const ga = ipv6Groups(allowed);
  const gb = ipv6Groups(seen);
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
