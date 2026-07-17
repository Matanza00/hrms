import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  useAttendance,
  useBreakEnd,
  useBreakStart,
  useCheckIn,
  useCheckOut,
} from "@/hooks/useAttendance";
import type { AttendanceRecord } from "@/lib/api/attendance";
import { useAuth } from "@/lib/auth/AuthContext";

export const Route = createFileRoute("/employee/attendance")({
  component: EmployeeAttendance,
});

// The office runs a 18:00 -> 03:00 shift that crosses midnight, so a "day" is a
// business day, not a calendar day. Everything is evaluated in the office time
// zone (never the device's) so every device/account agrees with the server.
const OFFICE_TZ = "Asia/Karachi";
const DAY_ROLLOVER_HOUR = 12; // times before noon belong to the previous shift day

/** {y,m,d,h} of a moment as seen in the office time zone. */
function officeParts(date: Date) {
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
function currentBusinessDate() {
  const { y, m, d, h } = officeParts(new Date());
  let dt = new Date(Date.UTC(y, m - 1, d));
  if (h < DAY_ROLLOVER_HOUR) dt = new Date(dt.getTime() - 86400000);
  return dt.toISOString().slice(0, 10);
}

/** Compare a stored attendanceDate (yyyy-mm-dd, possibly with a time) to today. */
function isCurrentShift(value?: string) {
  if (!value) return false;
  return String(value).slice(0, 10) === currentBusinessDate();
}

function formatTime(v?: string) {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? String(v)
    : d.toLocaleTimeString("en-PK", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: OFFICE_TZ,
      });
}

function EmployeeAttendance() {
  const { employeeId, employeeCode } = useAuth();

  const { data: raw = [] } = useAttendance();
  const checkIn = useCheckIn();
  const breakStart = useBreakStart();
  const breakEnd = useBreakEnd();
  const checkOut = useCheckOut();

  // Scope strictly to the logged-in employee.
  const records = Array.isArray(raw)
    ? raw.filter((a) => a.employeeId === employeeId)
    : [];

  const todayRecord = records.find((a) =>
    isCurrentShift(a.attendanceDate || a.checkIn)
  );

  async function handleCheckIn() {
    if (!employeeCode) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        checkIn.mutate({
          employeeCode,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          ipAddress: "browser",
        });
      },
      () => {
        checkIn.mutate({
          employeeCode,
          latitude: 24.91412985,
          longitude: 67.1003725,
          ipAddress: "browser",
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold">My Attendance</h1>
      <p className="text-muted-foreground">
        Check in, breaks, checkout and history.
      </p>

      <div className="mt-6 rounded-2xl border bg-card p-5">
        <h3 className="mb-4 text-sm font-semibold">Today's Actions</h3>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={!!todayRecord?.checkIn || checkIn.isPending}
            onClick={handleCheckIn}
          >
            Check In
          </Button>

          <Button
            variant="outline"
            disabled={
              !todayRecord?.checkIn ||
              !!todayRecord?.breakStart ||
              breakStart.isPending
            }
            onClick={() => employeeCode && breakStart.mutate(employeeCode)}
          >
            Start Break
          </Button>

          <Button
            variant="outline"
            disabled={
              !todayRecord?.breakStart ||
              !!todayRecord?.breakEnd ||
              breakEnd.isPending
            }
            onClick={() => employeeCode && breakEnd.mutate(employeeCode)}
          >
            End Break
          </Button>

          <Button
            variant="outline"
            disabled={
              !todayRecord?.checkIn ||
              !!todayRecord?.checkOut ||
              checkOut.isPending
            }
            onClick={() => employeeCode && checkOut.mutate(employeeCode)}
          >
            Check Out
          </Button>
        </div>

        <div className="mt-4 grid gap-3 text-sm md:grid-cols-4">
          <p>Check In: {formatTime(todayRecord?.checkIn)}</p>
          <p>Break Start: {formatTime(todayRecord?.breakStart)}</p>
          <p>Break End: {formatTime(todayRecord?.breakEnd)}</p>
          <p>Check Out: {formatTime(todayRecord?.checkOut)}</p>
        </div>
      </div>

      <div className="mt-6">
        <DataTable<AttendanceRecord>
          rowKey={(r) => r.attendanceId}
          data={records}
          columns={[
            {
              key: "attendanceDate",
              header: "Date",
              render: (r) => r.attendanceDate || "—",
            },
            {
              key: "checkIn",
              header: "Check In",
              render: (r) => formatTime(r.checkIn),
            },
            {
              key: "checkOut",
              header: "Check Out",
              render: (r) => formatTime(r.checkOut),
            },
            {
              key: "workingMinutes",
              header: "Hours",
              render: (r) =>
                `${(Number(r.workingMinutes || 0) / 60).toFixed(2)}h`,
            },
            {
              key: "deficitMinutes",
              header: "Deficit",
              render: (r) =>
                `${(Number(r.deficitMinutes || 0) / 60).toFixed(2)}h`,
            },
            {
              key: "status",
              header: "Status",
              render: (r) => <StatusBadge status={r.attendanceStatus} />,
            },
          ]}
        />
      </div>
    </div>
  );
}
