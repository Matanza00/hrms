// Time helpers for the Asia/Karachi night shift (18:00 -> 03:00).
//
// Pakistan has no DST, so Karachi is a fixed UTC+5. We therefore read wall-clock
// parts by shifting the instant +5h and reading its UTC fields — simpler and
// more predictable than Intl formatting, and immune to the server's own TZ.

export const TZ = "Asia/Karachi";
export const KARACHI_OFFSET_MIN = 5 * 60;

export type WallParts = {
  year: number;
  month: number; // 0-based
  day: number;
  hour: number;
  minute: number;
  weekday: number; // 0 = Sunday .. 6 = Saturday
};

/** Wall-clock parts in Karachi for a given instant. */
export function karachiParts(d: Date): WallParts {
  const shifted = new Date(d.getTime() + KARACHI_OFFSET_MIN * 60_000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    weekday: shifted.getUTCDay(),
  };
}

/** "yyyy-MM-dd" calendar date in Karachi. */
export function karachiDateStr(d: Date): string {
  const p = karachiParts(d);
  return `${p.year}-${String(p.month + 1).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** Parse "HH:mm" into minutes-since-midnight, or null. */
export function parseHmToMinutes(hm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(hm ?? "");
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}
