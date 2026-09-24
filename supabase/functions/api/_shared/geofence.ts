// Geofence check — ports the corrected logic from
// docs/attendance-checkin-backend.gs:
//   - honours the geofencingEnabled toggle
//   - tolerates GPS drift via a buffer (default 50 m)
//   - FAILS OPEN when the office location isn't configured (never blocks the
//     whole company on a Settings mistake)
//   - once the office IS configured, a missing location is a refusal, not a
//     free pass — otherwise denying the browser's location prompt would be
//     the way around the fence
//   - reports the measured distance so a rejection is diagnosable
import type { SettingsMap } from "./settings.ts";
import { bool, num } from "./settings.ts";

export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Returns null when the attendance action is allowed, or an error message when
 * blocked. Applied to both ends of the shift: someone who checked in at the
 * office must still be at the office to check out.
 */
export function checkGeofence(
  settings: SettingsMap,
  userLat: unknown,
  userLng: unknown,
): string | null {
  if (!bool(settings.geofencingEnabled)) return null;

  const oLat = num(settings.officeLatitude, NaN);
  const oLng = num(settings.officeLongitude, NaN);
  const radius = num(settings.officeRadiusMeters, NaN);
  const buffer = num(settings.geofenceBufferMeters, 50);

  // Office location not configured -> fail open.
  if (!Number.isFinite(oLat) || !Number.isFinite(oLng) || !Number.isFinite(radius) || radius <= 0) {
    return null;
  }

  const uLat = Number(userLat);
  const uLng = Number(userLng);
  // The office is configured, so location is required. A phone that will not
  // share it cannot be placed inside the fence.
  if (!Number.isFinite(uLat) || !Number.isFinite(uLng)) {
    return "We could not get your location. Allow location for this site and try again.";
  }

  const distance = haversineMeters(oLat, oLng, uLat, uLng);
  if (distance > radius + buffer) {
    return `You are outside office radius (${Math.round(distance)}m from office, allowed ${radius}m).`;
  }
  return null;
}
