import { useQuery } from "@tanstack/react-query";
import { getLeaveRequests, type LeaveRequest } from "@/lib/api/leaves";
import { getAttendance, type AttendanceRecord } from "@/lib/api/attendance";
import { getHolidays, type Holiday } from "@/lib/api/holidays";
import { getSettings, type SettingsMap } from "@/lib/api/settings";
import { isInMonth, workingDaysInMonth } from "@/lib/businessDate";
import { monthlyHoursBalance } from "@/lib/hoursBalance";

/** Leave types that draw down a quota. "Unpaid" is excluded on purpose. */
const QUOTA_TYPES = ["Annual", "Casual", "Sick"] as const;
type QuotaType = (typeof QUOTA_TYPES)[number];

const SETTING_KEY: Record<QuotaType, string> = {
  Annual: "annualLeave",
  Casual: "casualLeave",
  Sick: "sickLeave",
};

function num(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function isApproved(status?: string) {
  return String(status || "").toLowerCase() === "approved";
}

function isPending(status?: string) {
  return String(status || "").toLowerCase() === "pending";
}

export type LeaveTypeStat = {
  type: QuotaType;
  quota: number;
  taken: number;
  remaining: number;
};

export type EmployeeStats = {
  isLoading: boolean;
  leaves: {
    entitlement: number;
    taken: number;
    remaining: number;
    pending: number;
    byType: LeaveTypeStat[];
  };
  hours: {
    monthWorked: number;
    monthTarget: number;
    remaining: number;
    deficit: number;
    surplus: number;
    requiredPerDay: number;
  };
  holidays: {
    upcoming: Holiday[];
    next: Holiday | null;
  };
};

/**
 * Aggregates leave balance, monthly working hours and upcoming holidays for a
 * single employee. Shared by the employee dashboard and leaves page so both
 * screens report identical numbers.
 */
export function useEmployeeStats(employeeId: string | null): EmployeeStats {
  const leavesQ = useQuery({ queryKey: ["leaveRequests"], queryFn: getLeaveRequests });
  const attendanceQ = useQuery({ queryKey: ["attendance"], queryFn: getAttendance });
  const holidaysQ = useQuery({ queryKey: ["holidays"], queryFn: getHolidays });
  const settingsQ = useQuery({ queryKey: ["settings"], queryFn: getSettings });

  const settings: SettingsMap = settingsQ.data ?? {};
  const allLeaves: LeaveRequest[] = Array.isArray(leavesQ.data) ? leavesQ.data : [];
  const allAttendance: AttendanceRecord[] = Array.isArray(attendanceQ.data) ? attendanceQ.data : [];
  const allHolidays: Holiday[] = Array.isArray(holidaysQ.data) ? holidaysQ.data : [];

  const myLeaves = employeeId ? allLeaves.filter((l) => l.employeeId === employeeId) : [];
  const myAttendance = employeeId ? allAttendance.filter((a) => a.employeeId === employeeId) : [];

  // ---- Leaves ---------------------------------------------------------------
  const byType: LeaveTypeStat[] = QUOTA_TYPES.map((type) => {
    const quota = num(settings[SETTING_KEY[type]]);
    const taken = myLeaves
      .filter((l) => l.leaveType === type && isApproved(l.status))
      .reduce((sum, l) => sum + num(l.totalDays), 0);
    return { type, quota, taken, remaining: Math.max(0, quota - taken) };
  });

  const entitlement = byType.reduce((s, t) => s + t.quota, 0);
  const taken = byType.reduce((s, t) => s + t.taken, 0);
  const pending = myLeaves
    .filter((l) => isPending(l.status))
    .reduce((sum, l) => sum + num(l.totalDays), 0);

  // ---- Hours (current month) ------------------------------------------------
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  // attendanceDate is already the business date, so compare the yyyy-mm text
  // rather than re-parsing it into the device's time zone.
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthAttendance = myAttendance.filter((a) =>
    isInMonth(a.attendanceDate || a.checkIn, monthKey),
  );

  const monthWorked = monthAttendance.reduce((sum, a) => sum + num(a.workingMinutes) / 60, 0);
  const requiredPerDay = num(settings.requiredHours, 8);
  const workingDays = workingDaysInMonth(year, month, settings, allHolidays);
  const monthTarget = workingDays * requiredPerDay;

  // Netted across the month: hours worked beyond the requirement on one day
  // cover a short day on another, which summing the per-row deficit cannot do.
  const balance = monthlyHoursBalance(myAttendance, {
    month: monthKey,
    settings,
    holidays: allHolidays,
    requiredPerDay,
    now,
  });

  // ---- Holidays -------------------------------------------------------------
  const startOfToday = new Date(year, month, now.getDate()).getTime();
  const upcoming = allHolidays
    .map((h) => ({ h, t: new Date(h.holidayDate).getTime() }))
    .filter(({ t }) => !Number.isNaN(t) && t >= startOfToday)
    .sort((a, b) => a.t - b.t)
    .map(({ h }) => h);

  return {
    isLoading:
      leavesQ.isLoading || attendanceQ.isLoading || holidaysQ.isLoading || settingsQ.isLoading,
    leaves: {
      entitlement,
      taken,
      remaining: Math.max(0, entitlement - taken),
      pending,
      byType,
    },
    hours: {
      monthWorked: Math.round(monthWorked * 10) / 10,
      monthTarget: Math.round(monthTarget * 10) / 10,
      remaining: Math.max(0, Math.round((monthTarget - monthWorked) * 10) / 10),
      deficit: balance.deficitHours,
      surplus: balance.surplusHours,
      requiredPerDay,
    },
    holidays: {
      upcoming,
      next: upcoming[0] ?? null,
    },
  };
}
