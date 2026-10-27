import { createFileRoute, Link } from "@tanstack/react-router";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PageHeader } from "@/components/shared/PageHeader";
import { ChartCard } from "@/components/shared/ChartCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { UserCheck, Clock, CalendarDays, Wallet, LayoutDashboard } from "lucide-react";
import { useEmployees } from "@/hooks/useEmployees";
import { useAttendance } from "@/hooks/useAttendance";
import { useQuery } from "@tanstack/react-query";
import { getLeaveRequests } from "@/lib/api/leaves";
import { getPayroll } from "@/lib/api/payroll";
import { useAuth } from "@/lib/auth/AuthContext";
import { formatHoursMinutes } from "@/lib/hoursBalance";

export const Route = createFileRoute("/employee/")({
  component: EmployeeDashboard,
});

function formatPKR(v: number | string | undefined) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(Number(v || 0));
}

function today(value?: string) {
  if (!value) return false;
  const d = new Date(value);
  const n = new Date();
  return (
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate()
  );
}

function EmployeeDashboard() {
  const { employeeId } = useAuth();
  const { data: employeesRaw = [] } = useEmployees();
  const { data: attendanceRaw = [] } = useAttendance();
  const { data: leavesRaw = [] } = useQuery({
    queryKey: ["leaveRequests"],
    queryFn: getLeaveRequests,
  });
  const { data: payrollRaw = [] } = useQuery({ queryKey: ["payroll"], queryFn: getPayroll });

  const employees = Array.isArray(employeesRaw) ? employeesRaw : [];
  const attendance = Array.isArray(attendanceRaw) ? attendanceRaw : [];
  const leaves = Array.isArray(leavesRaw) ? leavesRaw : [];
  const payroll = Array.isArray(payrollRaw) ? payrollRaw : [];

  const employee = employees.find((e) => e.employeeId === employeeId);
  const myAttendance = attendance.filter((a) => a.employeeId === employeeId);
  const myLeaves = leaves.filter((l) => l.employeeId === employeeId);
  const myPayroll = payroll.filter((p) => p.employeeId === employeeId);

  const todayAttendance = myAttendance.find((a) => today(a.attendanceDate || a.checkIn));
  // Newest non-cancelled payslip. (The API lists payroll newest-first, so the
  // last element was the *oldest* one.)
  const latestPayroll = myPayroll
    .filter((p) => p.status !== "Cancelled")
    .reduce<(typeof myPayroll)[number] | undefined>(
      (best, p) => (!best || String(p.month) > String(best.month) ? p : best),
      undefined,
    );

  const times = [
    { label: "Check in", value: todayAttendance?.checkIn },
    { label: "Break start", value: todayAttendance?.breakStart },
    { label: "Break end", value: todayAttendance?.breakEnd },
    { label: "Check out", value: todayAttendance?.checkOut },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        icon={LayoutDashboard}
        title={`Welcome, ${employee?.name || "Employee"}`}
        description="Your attendance, leaves and salary overview."
      />

      <div className="metric-strip grid grid-cols-2 md:grid-cols-4">
        <StatCard
          label="Today status"
          value={todayAttendance?.attendanceStatus || "—"}
          hint={todayAttendance ? undefined : "Not checked in yet"}
          icon={UserCheck}
          tone="accent"
        />
        <StatCard
          label="Working hours"
          value={formatHoursMinutes(Number(todayAttendance?.workingMinutes || 0))}
          icon={Clock}
          tone="warning"
        />
        <StatCard
          label="Leave requests"
          value={myLeaves.length}
          icon={CalendarDays}
          tone="accent"
        />
        <StatCard
          label="Latest net salary"
          value={latestPayroll ? formatPKR(latestPayroll.netSalary) : "—"}
          hint={latestPayroll ? undefined : "No payslip yet"}
          icon={Wallet}
          tone="success"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          title="Today's attendance"
          icon={Clock}
          tone="warning"
          bodyClassName=""
          action={
            <Button size="sm" variant="outline" asChild>
              <Link to="/employee/attendance">Open</Link>
            </Button>
          }
        >
          <dl className="space-y-2.5">
            {times.map((t) => (
              <div key={t.label} className="flex items-center justify-between gap-3">
                <dt className="text-[13px] text-muted-foreground">{t.label}</dt>
                <dd className="font-mono text-[13px] font-medium">{t.value || "—"}</dd>
              </div>
            ))}
          </dl>
        </ChartCard>

        <ChartCard title="Recent leaves" icon={CalendarDays} tone="violet" bodyClassName="">
          {myLeaves.length === 0 ? (
            <EmptyState icon={CalendarDays} title="No leave requests yet." />
          ) : (
            <ul className="-mx-5 -mt-5 -mb-4">
              {myLeaves.slice(-5).map((l) => (
                <li
                  key={l.leaveId}
                  className="flex items-center justify-between gap-3 border-b border-divider px-5 py-3 last:border-b-0"
                >
                  <span className="text-sm font-medium">
                    {l.leaveType}{" "}
                    <span className="font-mono text-xs font-normal text-muted-foreground">
                      · {Number(l.totalDays || 0)}d
                    </span>
                  </span>
                  <StatusBadge status={l.status} />
                </li>
              ))}
            </ul>
          )}
        </ChartCard>

        <ChartCard
          title="Latest payroll"
          icon={Wallet}
          tone="success"
          bodyClassName=""
          action={
            <Button size="sm" variant="outline" asChild>
              <Link to="/employee/payroll">View</Link>
            </Button>
          }
        >
          <p className="text-[13px] font-medium text-muted-foreground">Net salary</p>
          <p className="mt-1 font-mono text-[26px] font-medium leading-8 tracking-[-0.8px]">
            {formatPKR(latestPayroll?.netSalary)}
          </p>
        </ChartCard>
      </div>
    </div>
  );
}
