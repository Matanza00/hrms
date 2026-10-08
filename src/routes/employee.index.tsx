import { CURRENT_EMPLOYEE_CODE, CURRENT_EMPLOYEE_ID } from "@/lib/currentEmployee";
import { createFileRoute, Link } from "@tanstack/react-router";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { UserCheck, Clock, CalendarDays, Wallet } from "lucide-react";
import { useEmployees } from "@/hooks/useEmployees";
import { useAttendance } from "@/hooks/useAttendance";
import { useQuery } from "@tanstack/react-query";
import { getLeaveRequests } from "@/lib/api/leaves";
import { getPayroll } from "@/lib/api/payroll";


export const Route = createFileRoute("/employee/")({
  component: EmployeeDashboard,
});

function formatPKR(v: number | string | undefined) {
  return new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 }).format(Number(v || 0));
}

function today(value?: string) {
  if (!value) return false;
  const d = new Date(value);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

function EmployeeDashboard() {
  const { data: employeesRaw = [] } = useEmployees();
  const { data: attendanceRaw = [] } = useAttendance();
  const { data: leavesRaw = [] } = useQuery({ queryKey: ["leaveRequests"], queryFn: getLeaveRequests });
  const { data: payrollRaw = [] } = useQuery({ queryKey: ["payroll"], queryFn: getPayroll });

  const employees = Array.isArray(employeesRaw) ? employeesRaw : [];
  const attendance = Array.isArray(attendanceRaw) ? attendanceRaw : [];
  const leaves = Array.isArray(leavesRaw) ? leavesRaw : [];
  const payroll = Array.isArray(payrollRaw) ? payrollRaw : [];

  const employee = employees.find((e) => e.employeeId === CURRENT_EMPLOYEE_ID);
  const myAttendance = attendance.filter((a) => a.employeeId === CURRENT_EMPLOYEE_ID);
  const myLeaves = leaves.filter((l) => l.employeeId === CURRENT_EMPLOYEE_ID);
  const myPayroll = payroll.filter((p) => p.employeeId === CURRENT_EMPLOYEE_ID);

  const todayAttendance = myAttendance.find((a) => today(a.attendanceDate || a.checkIn));
  const latestPayroll = myPayroll[myPayroll.length - 1];

  return (
    <div>
      <h1 className="text-3xl font-bold">Welcome, {employee?.name || "Employee"}</h1>
      <p className="text-muted-foreground">Your attendance, leaves and salary overview.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Today Status" value={todayAttendance?.attendanceStatus || "Not Checked In"} icon={UserCheck} tone="accent" />
        <StatCard label="Working Hours" value={`${(Number(todayAttendance?.workingMinutes || 0) / 60).toFixed(2)}h`} icon={Clock} tone="success" />
        <StatCard label="Leave Requests" value={myLeaves.length} icon={CalendarDays} tone="warning" />
        <StatCard label="Latest Net Salary" value={formatPKR(latestPayroll?.netSalary)} icon={Wallet} tone="success" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border bg-card shadow-xs p-5">
          <h3 className="mb-3 text-sm font-semibold">Today's Attendance</h3>
          <div className="space-y-2 text-sm">
            <p>Check In: {todayAttendance?.checkIn || "—"}</p>
            <p>Break Start: {todayAttendance?.breakStart || "—"}</p>
            <p>Break End: {todayAttendance?.breakEnd || "—"}</p>
            <p>Check Out: {todayAttendance?.checkOut || "—"}</p>
          </div>
          <Button className="mt-4" asChild>
            <Link to="/employee/attendance">Open Attendance</Link>
          </Button>
        </div>

        <div className="rounded-2xl border bg-card shadow-xs p-5">
          <h3 className="mb-3 text-sm font-semibold">Recent Leaves</h3>
          <ul className="space-y-3">
            {myLeaves.slice(-5).map((l) => (
              <li key={l.leaveId} className="flex justify-between text-sm">
                <span>{l.leaveType} · {Number(l.totalDays || 0)}d</span>
                <StatusBadge status={l.status} />
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border bg-card shadow-xs p-5">
          <h3 className="mb-3 text-sm font-semibold">Latest Payroll</h3>
          <p className="text-sm text-muted-foreground">Net Salary</p>
          <p className="text-2xl font-semibold">{formatPKR(latestPayroll?.netSalary)}</p>
          <Button className="mt-4" asChild>
            <Link to="/employee/payroll">View Payroll</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}