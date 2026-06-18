import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useAttendance, useBreakEnd, useBreakStart, useCheckIn, useCheckOut } from "@/hooks/useAttendance";
import type { AttendanceRecord } from "@/lib/api/attendance";
import { CURRENT_EMPLOYEE_CODE, CURRENT_EMPLOYEE_ID } from "@/lib/currentEmployee";

export const Route = createFileRoute("/employee/attendance")({
  component: EmployeeAttendance,
});

function isToday(value?: string) {
  const d = new Date(value || "");
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

function formatTime(v?: string) {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" });
}

function EmployeeAttendance() {
  const { data: raw = [] } = useAttendance();
  const checkIn = useCheckIn();
  const breakStart = useBreakStart();
  const breakEnd = useBreakEnd();
  const checkOut = useCheckOut();

  const records = Array.isArray(raw) ? raw.filter((a) => a.employeeId === CURRENT_EMPLOYEE_ID) : [];
  const todayRecord = records.find((a) => isToday(a.attendanceDate || a.checkIn));

  async function handleCheckIn() {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        checkIn.mutate({
          employeeCode: CURRENT_EMPLOYEE_CODE,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          ipAddress: "browser",
        });
      },
      () => {
        checkIn.mutate({
          employeeCode: CURRENT_EMPLOYEE_CODE,
          latitude: 24.91412985,
          longitude: 67.1003725,
          ipAddress: "browser",
        });
      }
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold">My Attendance</h1>
      <p className="text-muted-foreground">Check in, breaks, checkout and history.</p>

      <div className="mt-6 rounded-2xl border bg-card p-5">
        <h3 className="mb-4 text-sm font-semibold">Today's Actions</h3>
        <div className="flex flex-wrap gap-2">
          <Button disabled={!!todayRecord?.checkIn || checkIn.isPending} onClick={handleCheckIn}>Check In</Button>
          <Button
            variant="outline"
            disabled={
              !todayRecord?.checkIn ||
              !!todayRecord?.breakStart ||
              breakStart.isPending
            }
            onClick={() => breakStart.mutate(CURRENT_EMPLOYEE_CODE)}
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
            onClick={() => breakEnd.mutate(CURRENT_EMPLOYEE_CODE)}
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
            onClick={() => checkOut.mutate(CURRENT_EMPLOYEE_CODE)}
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
            { key: "attendanceDate", header: "Date", render: (r) => r.attendanceDate || "—" },
            { key: "checkIn", header: "Check In", render: (r) => formatTime(r.checkIn) },
            { key: "checkOut", header: "Check Out", render: (r) => formatTime(r.checkOut) },
            { key: "workingMinutes", header: "Hours", render: (r) => `${(Number(r.workingMinutes || 0) / 60).toFixed(2)}h` },
            { key: "deficitMinutes", header: "Deficit", render: (r) => `${(Number(r.deficitMinutes || 0) / 60).toFixed(2)}h` },
            { key: "status", header: "Status", render: (r) => <StatusBadge status={r.attendanceStatus} /> },
          ]}
        />
      </div>
    </div>
  );
}