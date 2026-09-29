import type { AttendanceRecord } from "@/lib/api/attendance";
import type { Holiday } from "@/lib/api/holidays";
import type { SettingsMap } from "@/lib/api/settings";
import { currentBusinessDate, isInMonth, workingDaysInMonth } from "./businessDate";

/**
 * An employee's hours for a month, netted.
 *
 * The stored `deficitMinutes` on each row is clamped at zero, so a ten-hour day
 * records no surplus and adding those rows up can only ever show a shortfall.
 * The netting here therefore works from `workingMinutes`, which keeps the extra
 * time, and compares the total against the days that have actually come round.
 */
export type HoursBalance = {
  workedHours: number;
  /** Working days elapsed this month x the daily requirement. */
  expectedHours: number;
  /** Hours owed once the extra ones have been counted; 0 when level or ahead. */
  deficitHours: number;
  /** Hours worked beyond what was expected. */
  surplusHours: number;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

function num(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * How many working days of `month` (yyyy-mm) have come round already.
 *
 * Today's shift only counts once it is closed. While someone is still working
 * it, their hours are not recorded yet, so counting the day would show them a
 * full day's deficit all evening that disappears at checkout.
 *
 * A day whose shift was never closed at all is left out for the same reason:
 * a forgotten checkout means the hours are unknown, not that nobody worked,
 * and charging a full day against it would be a fiction. Days with no record
 * whatsoever do count — an absence is a real shortfall.
 */
/** Days of the month holding a shift that was never checked out of. */
function openDays(monthRecords: AttendanceRecord[]): Set<number> {
  const days = new Set<number>();
  for (const r of monthRecords) {
    if (r.checkOut) continue;
    const day = Number(String(r.attendanceDate || "").slice(8, 10));
    if (Number.isFinite(day) && day > 0) days.add(day);
  }
  return days;
}

function elapsedWorkingDays(
  month: string,
  monthRecords: AttendanceRecord[],
  settings: SettingsMap,
  holidays: Holiday[],
  now: Date,
) {
  const [year, monthNo] = month.split("-").map(Number);
  const monthIndex = monthNo - 1;
  const today = currentBusinessDate(now);
  const thisMonth = today.slice(0, 7);

  if (month > thisMonth) return 0;
  if (month < thisMonth) {
    return workingDaysInMonth(
      year,
      monthIndex,
      settings,
      holidays,
      undefined,
      openDays(monthRecords),
    );
  }

  const todayClosed = monthRecords.some(
    (r) => String(r.attendanceDate || "").slice(0, 10) === today && !!r.checkOut,
  );
  const throughDay = Number(today.slice(8, 10)) - (todayClosed ? 0 : 1);
  return workingDaysInMonth(
    year,
    monthIndex,
    settings,
    holidays,
    Math.max(0, throughDay),
    openDays(monthRecords),
  );
}

/**
 * Net one employee's hours for a month. `records` may hold any dates; only the
 * ones inside `month` are counted.
 */
export function monthlyHoursBalance(
  records: AttendanceRecord[],
  opts: {
    month: string;
    settings: SettingsMap;
    holidays: Holiday[];
    requiredPerDay: number;
    now?: Date;
  },
): HoursBalance {
  const { month, settings, holidays, requiredPerDay, now = new Date() } = opts;

  const monthRecords = records.filter((r) => isInMonth(r.attendanceDate || r.checkIn, month));
  const workedHours = monthRecords.reduce((sum, r) => sum + num(r.workingMinutes) / 60, 0);
  const expectedHours =
    elapsedWorkingDays(month, monthRecords, settings, holidays, now) * requiredPerDay;

  const balance = workedHours - expectedHours;

  return {
    workedHours: round1(workedHours),
    expectedHours: round1(expectedHours),
    deficitHours: round1(Math.max(0, -balance)),
    surplusHours: round1(Math.max(0, balance)),
  };
}

/** A single shift's balance in minutes: negative when short, positive when over. */
export function dayBalanceMinutes(record: AttendanceRecord, requiredPerDay: number): number | null {
  if (!record.checkOut) return null;
  return num(record.workingMinutes) - requiredPerDay * 60;
}
