// The heart of the fixes described in docs/attendance-checkin-backend.gs, ported
// to TypeScript and made server-authoritative.
import { karachiParts, parseHmToMinutes } from "./time.ts";

/**
 * Business date of an instant for the overnight shift, "yyyy-MM-dd" in Karachi.
 * Hours before `rolloverHour` (default noon) belong to the PREVIOUS business day,
 * so an 8 PM check-in and its 2 AM check-out share ONE date.
 */
export function getBusinessDate(now: Date, rolloverHour = 12): string {
  const p = karachiParts(now);
  let { year: y, month: m, day: d } = p;
  if (p.hour < rolloverHour) {
    const prev = new Date(Date.UTC(y, m, d) - 24 * 3600 * 1000);
    y = prev.getUTCFullYear();
    m = prev.getUTCMonth();
    d = prev.getUTCDate();
  }
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Weekend check honouring the saturdayOff / sundayOff settings, in Karachi. */
export function isWeekend(now: Date, saturdayOff: boolean, sundayOff: boolean): boolean {
  const wd = karachiParts(now).weekday;
  if (wd === 6 && saturdayOff) return true;
  if (wd === 0 && sundayOff) return true;
  return false;
}

/**
 * Minutes late vs officeStartTime + grace, using the Karachi wall clock of the
 * check-in. A check-in after midnight (hour < noon) is measured against the
 * PREVIOUS evening's start, so it counts as very late rather than very early.
 */
export function getLateMinutes(
  checkIn: Date,
  officeStartTime: string,
  graceMinutes: number,
): number {
  const start = parseHmToMinutes(officeStartTime);
  if (start == null) return 0;
  const p = karachiParts(checkIn);
  let ciMins = p.hour * 60 + p.minute;
  if (p.hour < 12) ciMins += 24 * 60; // after-midnight wrap for the evening shift
  const allowed = start + (graceMinutes || 0);
  return Math.max(0, ciMins - allowed);
}

export function isLate(checkIn: Date, officeStartTime: string, graceMinutes: number): boolean {
  return getLateMinutes(checkIn, officeStartTime, graceMinutes) > 0;
}

function minutesBetween(a?: unknown, b?: unknown): number {
  if (!a || !b) return 0;
  const da = new Date(a as string);
  const db = new Date(b as string);
  if (isNaN(da.getTime()) || isNaN(db.getTime())) return 0;
  return Math.max(0, Math.round((db.getTime() - da.getTime()) / 60000));
}

/** Recompute break/working/deficit minutes from raw timestamps + requiredHours. */
export function computeWorkMinutes(
  fields: { checkIn?: unknown; checkOut?: unknown; breakStart?: unknown; breakEnd?: unknown },
  requiredHours: number,
): { breakMinutes: number; workingMinutes: number; deficitMinutes: number } {
  const breakMinutes = minutesBetween(fields.breakStart, fields.breakEnd);
  const gross = minutesBetween(fields.checkIn, fields.checkOut);
  const workingMinutes = Math.max(0, gross - breakMinutes);
  // Only charge a deficit once the shift is closed (there's a checkOut).
  const deficitMinutes = fields.checkOut
    ? Math.max(0, Math.round(requiredHours * 60) - workingMinutes)
    : 0;
  return { breakMinutes, workingMinutes, deficitMinutes };
}
