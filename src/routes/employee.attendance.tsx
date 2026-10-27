import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Clock, Coffee, History, LogIn, LogOut, TimerReset } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { ChartCard } from "@/components/shared/ChartCard";
import { StatCard } from "@/components/shared/StatCard";
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
import { dayBalanceMinutes, formatHoursMinutes } from "@/lib/hoursBalance";
import { useQuery } from "@tanstack/react-query";
import { getSettings } from "@/lib/api/settings";
import { useCurrentBusinessDate } from "@/hooks/useBusinessDate";

export const Route = createFileRoute("/employee/attendance")({
  head: () => ({ meta: [{ title: "My Attendance — LDS HRMS" }] }),
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
          new Error("We could not get your location. Allow location for this site and try again."),
        ),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  });
}

function EmployeeAttendance() {
  const { employeeId, employeeCode } = useAuth();

  const { data: raw = [] } = useAttendance();
  const { data: settings = {} } = useQuery({ queryKey: ["settings"], queryFn: getSettings });
  const requiredPerDay = Number(settings.requiredHours) || 8;
  const checkIn = useCheckIn();
  const breakStart = useBreakStart();
  const breakEnd = useBreakEnd();
  const checkOut = useCheckOut();
  const businessDate = useCurrentBusinessDate();
  const [actionError, setActionError] = useState("");
  // Getting the GPS fix can take seconds before the request even starts; the
  // button must lock (and say so) from the first tap, or a second tap sends a
  // second check-in/out.
  const [locating, setLocating] = useState<"in" | "out" | null>(null);

  // Surface server rejections (already checked in, holiday, geofence, ...)
  // instead of the button silently doing nothing.
  const onError = (err: Error) => setActionError(err.message || "Something went wrong");

  // Scope strictly to the logged-in employee.
  const records = Array.isArray(raw) ? raw.filter((a) => a.employeeId === employeeId) : [];

  const todayRecord = records.find((a) =>
    isCurrentShift(a.attendanceDate || a.checkIn, businessDate),
  );

  async function handleCheckIn() {
    if (!employeeCode || locating || checkIn.isPending) return;
    setActionError("");
    setLocating("in");
    try {
      const where = await currentPosition();
      checkIn.mutate({ employeeCode, ...where, ipAddress: "browser" }, { onError });
    } catch (err) {
      onError(err as Error);
    } finally {
      setLocating(null);
    }
  }

  async function handleCheckOut() {
    if (!employeeCode || locating || checkOut.isPending) return;
    setActionError("");
    setLocating("out");
    try {
      const where = await currentPosition();
      checkOut.mutate({ employeeCode, ...where, ipAddress: "browser" }, { onError });
    } catch (err) {
      onError(err as Error);
    } finally {
      setLocating(null);
    }
  }

  // 44px on phones, where these are thumbed; the system's 32px from sm up.
  const actionBtn = "max-sm:h-11 max-sm:flex-1 max-sm:basis-[calc(50%-4px)]";

  return (
    <div>
      <PageHeader
        icon={Clock}
        title="My attendance"
        description="Check in, breaks, checkout and history."
      />

      <ChartCard
        title="Today's actions"
        description="Location is checked when you check in and out"
        icon={Clock}
        tone="warning"
        bodyClassName=""
      >
        {actionError && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2 rounded-lg border border-danger-line bg-danger-tint px-3 py-2.5 text-[13px] text-danger-ink"
          >
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            {actionError}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            className={actionBtn}
            disabled={!!todayRecord?.checkIn || checkIn.isPending || locating !== null}
            onClick={handleCheckIn}
          >
            <LogIn />
            {locating === "in" ? "Locating…" : checkIn.isPending ? "Checking in…" : "Check In"}
          </Button>

          <Button
            variant="outline"
            className={actionBtn}
            disabled={!todayRecord?.checkIn || !!todayRecord?.breakStart || breakStart.isPending}
            onClick={() => {
              if (!employeeCode) return;
              setActionError("");
              breakStart.mutate(employeeCode, { onError });
            }}
          >
            <Coffee />
            Start Break
          </Button>

          <Button
            variant="outline"
            className={actionBtn}
            disabled={!todayRecord?.breakStart || !!todayRecord?.breakEnd || breakEnd.isPending}
            onClick={() => {
              if (!employeeCode) return;
              setActionError("");
              breakEnd.mutate(employeeCode, { onError });
            }}
          >
            <TimerReset />
            End Break
          </Button>

          <Button
            variant="outline"
            className={actionBtn}
            disabled={
              !todayRecord?.checkIn ||
              !!todayRecord?.checkOut ||
              checkOut.isPending ||
              locating !== null
            }
            onClick={handleCheckOut}
          >
            <LogOut />
            {locating === "out" ? "Locating…" : checkOut.isPending ? "Checking out…" : "Check Out"}
          </Button>
        </div>

        <div className="metric-strip mt-5 mb-1 grid grid-cols-2 md:grid-cols-4">
          <StatCard
            label="Check in"
            value={formatTime(todayRecord?.checkIn)}
            icon={LogIn}
            tone="success"
          />
          <StatCard
            label="Break start"
            value={formatTime(todayRecord?.breakStart)}
            icon={Coffee}
            tone="warning"
          />
          <StatCard
            label="Break end"
            value={formatTime(todayRecord?.breakEnd)}
            icon={TimerReset}
            tone="warning"
          />
          <StatCard
            label="Check out"
            value={formatTime(todayRecord?.checkOut)}
            icon={LogOut}
            tone="accent"
          />
        </div>
      </ChartCard>

      <div className="mb-3 mt-6 flex items-center gap-1.5">
        <History className="size-3.5 text-muted-foreground" />
        <h3 className="text-sm font-semibold tracking-[-0.2px]">History</h3>
      </div>
      <div>
        <DataTable<AttendanceRecord>
          rowKey={(r) => r.attendanceId}
          data={records}
          columns={[
            {
              key: "attendanceDate",
              header: "Date",
              render: (r) => (
                <span className="font-mono text-[13px]">{r.attendanceDate || "—"}</span>
              ),
            },
            {
              key: "checkIn",
              header: "Check In",
              render: (r) => <span className="font-mono text-[13px]">{formatTime(r.checkIn)}</span>,
            },
            {
              key: "checkOut",
              header: "Check Out",
              render: (r) => (
                <span className="font-mono text-[13px]">{formatTime(r.checkOut)}</span>
              ),
            },
            {
              key: "workingMinutes",
              header: "Hours",
              render: (r) => (
                <span className="font-mono text-[13px] font-medium">
                  {r.checkOut ? formatHoursMinutes(Number(r.workingMinutes || 0)) : "—"}
                </span>
              ),
            },
            {
              // Short or over for the day; the month nets these out.
              key: "deficitMinutes",
              header: "Balance",
              render: (r) => {
                const balance = dayBalanceMinutes(r, requiredPerDay);
                if (balance === null) return <span className="font-mono text-[13px]">—</span>;
                if (balance === 0) return <span className="font-mono text-[13px]">0m</span>;
                const amount = formatHoursMinutes(balance);
                return balance < 0 ? (
                  <span className="font-mono text-[13px] font-medium text-danger-ink">
                    -{amount}
                  </span>
                ) : (
                  <span className="font-mono text-[13px] font-medium text-success-ink">
                    +{amount}
                  </span>
                );
              },
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
