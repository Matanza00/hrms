import {
  createFileRoute,
  Link,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  UserCheck,
  UserX,
  Clock,
  AlertTriangle,
  Activity,
  Download,
  Pencil,
  Plus,
} from "lucide-react";
import { useState } from "react";
import { useAttendance } from "@/hooks/useAttendance";
import type { AttendanceRecord } from "@/lib/api/attendance";
import { useEmployees } from "@/hooks/useEmployees";
import { AttendanceEditDialog } from "@/components/attendance/AttendanceEditDialog";

export const Route = createFileRoute("/_app/attendance")({
  component: AttendanceLayout,
});

function minutesToHours(minutes?: number) {
  return (Number(minutes || 0) / 60).toFixed(2);
}

function formatDate(value?: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value?: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleTimeString("en-PK", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/** Millis for sorting; falls back to the check-in time when no date. */
function recordTime(r: AttendanceRecord) {
  const raw = r.attendanceDate || r.checkIn || "";
  const t = new Date(raw).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function isLate(value: AttendanceRecord["isLate"]) {
  return value === true || value === "TRUE";
}

function AttendanceLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });

  const tabs = [
    { url: "/attendance", label: "Overview" },
    { url: "/attendance/live", label: "Live Monitoring" },
    { url: "/attendance/corrections", label: "Corrections" },
    { url: "/attendance/qr", label: "QR & Devices" },
  ];

  const isRoot = path === "/attendance";

  return (
    <div>
      <PageHeader
        title="Attendance"
        description="Monitor check-ins, breaks and working hours across the team."
        actions={
          <Button variant="outline" size="sm">
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export CSV
          </Button>
        }
      />

      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border bg-card p-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:inline-flex [&::-webkit-scrollbar]:hidden">
        {tabs.map((t) => {
          const active = path === t.url;

          return (
            <Link
              key={t.url}
              to={t.url}
              className={`flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-lg px-3.5 py-1.5 text-xs font-medium transition sm:min-h-0 ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {isRoot ? <AttendanceOverview /> : <Outlet />}
    </div>
  );
}

function AttendanceOverview() {
  const { data: attendanceRecords = [], isLoading, error } = useAttendance();

  // Newest first — latest check-ins/check-outs at the top.
  const sortedRecords = [...attendanceRecords].sort(
    (a, b) => recordTime(b) - recordTime(a)
  );

  const { data: employeesRaw = [] } = useEmployees();

  const employees = Array.isArray(employeesRaw)
    ? employeesRaw
    : [];

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AttendanceRecord | null>(null);

  function openEdit(record: AttendanceRecord) {
    setEditing(record);
    setDialogOpen(true);
  }

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function getEmployeeName(employeeId?: string) {
    const employee = employees.find(
      (e) => e.employeeId === employeeId
    );

    return employee?.name || employeeId || "Unknown";
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
        Loading attendance...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error instanceof Error ? error.message : "Something went wrong"}
      </div>
    );
  }
  

  const present = attendanceRecords.filter(
    (r) => r.attendanceStatus === "Present"
  ).length;

  const absent = attendanceRecords.filter(
    (r) => r.attendanceStatus === "Absent"
  ).length;

  const halfDay = attendanceRecords.filter(
    (r) => r.attendanceStatus === "Half Day"
  ).length;

  const late = attendanceRecords.filter((r) => isLate(r.isLate)).length;

  const totalDeficitMinutes = attendanceRecords.reduce(
    (sum, r) => sum + Number(r.deficitMinutes || 0),
    0
  );

  const attendanceRate =
    attendanceRecords.length > 0
      ? Math.round((present / attendanceRecords.length) * 100)
      : 0;

  return (
    <>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatCard label="Present" value={present} icon={UserCheck} tone="success" />
        <StatCard label="Absent" value={absent} icon={UserX} tone="danger" />
        <StatCard label="Late" value={late} icon={Clock} tone="warning" />
        <StatCard
          label="Deficit Hours"
          value={`${minutesToHours(totalDeficitMinutes)}h`}
          icon={AlertTriangle}
          tone="warning"
        />
        <StatCard
          label="Attendance Rate"
          value={`${attendanceRate}%`}
          icon={Activity}
          tone="accent"
        />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Records</h3>
        <Button size="sm" variant="outline" onClick={openCreate}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add record
        </Button>
      </div>

      <div className="mt-3">
        <DataTable<AttendanceRecord>
          rowKey={(r) => r.attendanceId}
          data={sortedRecords}
          columns={[
            {
              key: "employee",
              header: "Employee",
              render: (r) => (
                <span className="font-medium">
                  {r.employeeName || getEmployeeName(r.employeeId)}
                </span>
              ),
            },
            {
              key: "attendanceDate",
              header: "Date",
              render: (r) => (
                <span className="whitespace-nowrap">
                  {formatDate(r.attendanceDate || r.checkIn)}
                </span>
              ),
            },
            {
              key: "checkIn",
              header: "Check In",
              render: (r) => (
                <span className="whitespace-nowrap tabular-nums">
                  {formatTime(r.checkIn)}
                </span>
              ),
            },
            {
              key: "checkOut",
              header: "Check Out",
              render: (r) => (
                <span className="whitespace-nowrap tabular-nums">
                  {formatTime(r.checkOut)}
                </span>
              ),
            },
            {
              key: "break",
              header: "Break",
              render: (r) => (
                <span className="whitespace-nowrap tabular-nums">
                  {r.breakStart || r.breakEnd
                    ? `${formatTime(r.breakStart)} – ${formatTime(r.breakEnd)}`
                    : "—"}
                </span>
              ),
            },
            {
              key: "workingMinutes",
              header: "Hours",
              render: (r) => (
                <span className="tabular-nums">
                  {minutesToHours(r.workingMinutes)}
                </span>
              ),
            },
            {
              key: "deficitMinutes",
              header: "Deficit",
              render: (r) => (
                <span className="tabular-nums">
                  {minutesToHours(r.deficitMinutes)}
                </span>
              ),
            },
            {
              key: "late",
              header: "Late",
              render: (r) =>
                isLate(r.isLate) ? (
                  <StatusBadge status="Late" />
                ) : (
                  <span className="text-xs text-muted-foreground">No</span>
                ),
            },
            {
              key: "status",
              header: "Status",
              render: (r) => <StatusBadge status={r.attendanceStatus} />,
            },
            {
              key: "location",
              header: "Location",
              hideOnMobile: true,
              render: (r) =>
                r.latitude && r.longitude
                  ? `${r.latitude}, ${r.longitude}`
                  : "—",
            },
            {
              key: "ipAddress",
              header: "IP",
              hideOnMobile: true,
              render: (r) => (
                <span className="font-mono text-xs text-muted-foreground">
                  {r.ipAddress || "—"}
                </span>
              ),
            },
            {
              key: "actions",
              header: "",
              className: "text-right",
              render: (r) => (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7"
                  onClick={() => openEdit(r)}
                >
                  <Pencil className="mr-1 h-3 w-3" />
                  Edit
                </Button>
              ),
            },
          ]}
        />
      </div>

      <AttendanceEditDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        record={editing}
        employees={employees}
      />
    </>
  );
}