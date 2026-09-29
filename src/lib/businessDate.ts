/**
 * The office runs a 18:00 -> 03:00 shift that crosses midnight, so a "day" is a
 * business day, not a calendar day: everything before `DAY_ROLLOVER_HOUR`
 * belongs to the previous shift day. Times are read in the office zone (never
 * the device's) so every device and the server agree.
 *
 * Mirrors supabase/functions/api/_shared/businessDate.ts, which decides the
 * attendanceDate rows are actually stored under.
 */
import type { Holiday } from "@/lib/api/holidays";
import type { SettingsMap } from "@/lib/api/settings";

export const OFFICE_TZ = "Asia/Karachi";
export const DAY_ROLLOVER_HOUR = 12;

/** {y,m,d,h} of a moment as seen in the office time zone. */
export function officeParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: OFFICE_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { y: g("year"), m: g("month"), d: g("day"), h: g("hour") };
}

/** Current business date (yyyy-mm-dd) in the office zone, with noon rollover. */
export function currentBusinessDate(now: Date = new Date()): string {
  const { y, m, d, h } = officeParts(now);
  let dt = new Date(Date.UTC(y, m - 1, d));
  if (h < DAY_ROLLOVER_HOUR) dt = new Date(dt.getTime() - 86400000);
  return dt.toISOString().slice(0, 10);
}

/** Compare a stored attendanceDate (yyyy-mm-dd, possibly with a time) to a business date. */
export function isCurrentShift(value: string | undefined, businessDate: string) {
  if (!value) return false;
  return String(value).slice(0, 10) === businessDate;
}

/** Month (yyyy-mm) the current shift day falls in — the basis for monthly totals. */
export function currentBusinessMonth(now: Date = new Date()): string {
  return currentBusinessDate(now).slice(0, 7);
}

/** Is a stored date (yyyy-mm-dd or an ISO timestamp) inside the given yyyy-mm month? */
export function isInMonth(value: string | undefined, month: string) {
  if (!value) return false;
  return String(value).slice(0, 7) === month;
}

function truthy(value: unknown) {
  return value === true || value === "TRUE" || value === "true";
}

/**
 * Count working days in a month, honouring the weekend and holiday settings.
 *
 * `throughDay` (1-31) stops the count early, which is how "days elapsed so far"
 * is asked for; leaving it out counts the whole month. `excludeDays` drops
 * individual days of the month from the count.
 */
export function workingDaysInMonth(
  year: number,
  month: number,
  settings: SettingsMap,
  holidays: Holiday[],
  throughDay?: number,
  excludeDays?: Set<number>,
) {
  const saturdayOff = truthy(settings.saturdayOff ?? true);
  const sundayOff = truthy(settings.sundayOff ?? true);

  const holidaySet = new Set(
    holidays
      .map((h) => new Date(h.holidayDate))
      .filter(
        (d) => !Number.isNaN(d.getTime()) && d.getFullYear() === year && d.getMonth() === month,
      )
      .map((d) => d.getDate()),
  );

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const lastDay = Math.min(throughDay ?? daysInMonth, daysInMonth);

  let count = 0;
  for (let day = 1; day <= lastDay; day++) {
    const dow = new Date(year, month, day).getDay();
    if (dow === 6 && saturdayOff) continue;
    if (dow === 0 && sundayOff) continue;
    if (holidaySet.has(day)) continue;
    if (excludeDays?.has(day)) continue;
    count++;
  }
  return count;
}
