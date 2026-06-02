import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { attendanceRecords, type AttendanceRecord } from "@/lib/mock-data";
import { UserCheck, UserX, Clock, AlertTriangle, Activity, Download } from "lucide-react";

export const Route = createFileRoute("/_app/attendance")({
  component: AttendanceLayout,
});

function AttendanceLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const tabs = [
    { url: "/attendance", label: "Overview" },
    { url: "/attendance/live", label: "Live Monitoring" },
    { url: "/attendance/corrections", label: "Corrections" },
  ];
  const isRoot = path === "/attendance";
  return (
    <div>
      <PageHeader
        title="Attendance"
        description="Monitor check-ins, breaks and working hours across the team."
        actions={<Button variant="outline" size="sm"><Download className="mr-1.5 h-3.5 w-3.5" />Export CSV</Button>}
      />
      <div className="mb-6 inline-flex rounded-xl border bg-card p-1">
        {tabs.map((t) => {
          const active = path === t.url;
          return (
            <Link key={t.url} to={t.url} className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
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
  return (
    <>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatCard label="Present" value="41" icon={UserCheck} tone="success" />
        <StatCard label="Absent" value="3" icon={UserX} tone="danger" />
        <StatCard label="Late" value="4" icon={Clock} tone="warning" />
        <StatCard label="Deficit Hours" value="6.5h" icon={AlertTriangle} tone="warning" />
        <StatCard label="Attendance Rate" value="93%" icon={Activity} tone="accent" />
      </div>
      <div className="mt-6">
        <DataTable<AttendanceRecord>
          rowKey={(r) => r.id}
          data={attendanceRecords}
          columns={[
            { key: "employee", header: "Employee", render: (r) => <span className="font-medium">{r.employeeName}</span> },
            { key: "checkIn", header: "Check In", render: (r) => r.checkIn ?? "—" },
            { key: "checkOut", header: "Check Out", render: (r) => r.checkOut ?? "—" },
            { key: "break", header: "Break", render: (r) => `${r.breakStart}–${r.breakEnd}` },
            { key: "workingHours", header: "Hours", render: (r) => <span className="tabular-nums">{r.workingHours.toFixed(2)}</span> },
            { key: "deficitHours", header: "Deficit", render: (r) => <span className="tabular-nums">{r.deficitHours.toFixed(2)}</span> },
            { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
            { key: "location", header: "Location" },
            { key: "ipAddress", header: "IP", render: (r) => <span className="font-mono text-xs text-muted-foreground">{r.ipAddress}</span> },
          ]}
        />
      </div>
    </>
  );
}
