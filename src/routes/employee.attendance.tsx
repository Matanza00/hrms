import { useState } from "react";
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
import { isCurrentShift, OFFICE_TZ } from "@/lib/businessDate";
import { useCurrentBusinessDate } from "@/hooks/useBusinessDate";

export const Route = createFileRoute("/employee/attendance")({
  component: EmployeeAttendance,
});

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

/**
 * The phone's position. Attendance is fenced to the office at both ends, so a
 * refused or unavailable fix is an error the employee sees — never a stand-in
 * location, which would place everyone at the office by default.
 */
function currentPosition(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return reject(new Error("This device cannot share its location."));
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () =>
        reject(
          new Error("We could not get your location. Allow location for this site and try again.")
        ),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

function EmployeeAttendance() {
  const { employeeId, employeeCode } = useAuth();

  const { data: raw = [] } = useAttendance();
  const checkIn = useCheckIn();
  const breakStart = useBreakStart();
  const breakEnd = useBreakEnd();
  const checkOut = useCheckOut();
  const businessDate = useCurrentBusinessDate();
  const [actionError, setActionError] = useState("");

  // Surface server rejections (already checked in, holiday, geofence, ...)
  // instead of the button silently doing nothing.
  const onError = (err: Error) =>
    setActionError(err.message || "Something went wrong");

  // Scope strictly to the logged-in employee.
  const records = Array.isArray(raw)
    ? raw.filter((a) => a.employeeId === employeeId)
    : [];

  const todayRecord = records.find((a) =>
    isCurrentShift(a.attendanceDate || a.checkIn, businessDate)
  );

  async function handleCheckIn() {
    if (!employeeCode) return;
    setActionError("");
    try {
      const where = await currentPosition();
      checkIn.mutate({ employeeCode, ...where, ipAddress: "browser" }, { onError });
    } catch (err) {
      onError(err as Error);
    }
  }

  async function handleCheckOut() {
    if (!employeeCode) return;
    setActionError("");
    try {
      const where = await currentPosition();
      checkOut.mutate({ employeeCode, ...where, ipAddress: "browser" }, { onError });
    } catch (err) {
      onError(err as Error);
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold">My Attendance</h1>
      <p className="text-muted-foreground">
        Check in, breaks, checkout and history.
      </p>

      <div className="mt-6 rounded-2xl border bg-card p-5">
        <h3 className="mb-4 text-sm font-semibold">Today's Actions</h3>

        {actionError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {actionError}
          </div>
        )}

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
            onClick={() => {
              if (!employeeCode) return;
              setActionError("");
              breakStart.mutate(employeeCode, { onError });
            }}
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
            onClick={() => {
              if (!employeeCode) return;
              setActionError("");
              breakEnd.mutate(employeeCode, { onError });
            }}
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
            onClick={handleCheckOut}
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
