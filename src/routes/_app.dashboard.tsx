import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, SectionHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { ChartCard } from "@/components/shared/ChartCard";
import { Button } from "@/components/ui/button";
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  CalendarClock,
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  BadgeDollarSign,
  Download,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useEmployees } from "@/hooks/useEmployees";
import { useAttendance } from "@/hooks/useAttendance";
import { useQuery } from "@tanstack/react-query";
import { getLeaveRequests } from "@/lib/api/leaves";
import { getPayroll } from "@/lib/api/payroll";
import {
  getExpenses,
  getRevenue,
  getReserveLedger,
  type ReserveTransaction,
} from "@/lib/api/accounts";
import { isCurrentShift, isInMonth } from "@/lib/businessDate";
import { useCurrentBusinessDate } from "@/hooks/useBusinessDate";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — LDS HRMS" }] }),
  component: Dashboard,
});

function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}

function formatPKR(value: number | string | undefined) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatPKRCompact(value: number | string | undefined) {
  return new Intl.NumberFormat("en-PK", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  }).format(Number(value || 0));
}

function monthKey(value?: string) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 7);

  return date.toLocaleDateString("en-PK", {
    month: "short",
    year: "2-digit",
  });
}

function formatTime(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleTimeString("en-PK", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isLate(value: unknown) {
  return value === true || value === "TRUE" || value === "true";
}

function buildAttendanceTrend(records: any[]) {
  const map = new Map<string, { month: string; present: number; late: number }>();

  records.forEach((r) => {
    const key = monthKey(r.attendanceDate || r.checkIn || r.createdAt);

    if (!map.has(key)) {
      map.set(key, { month: key, present: 0, late: 0 });
    }

    const item = map.get(key)!;

    if (r.attendanceStatus === "Present") item.present += 1;
    if (isLate(r.isLate)) item.late += 1;
  });

  return Array.from(map.values()).slice(-6);
}

function buildPayrollTrend(records: any[]) {
  const map = new Map<string, { month: string; payroll: number }>();

  records
    .filter((p) => p.status !== "Cancelled")
    .forEach((p) => {
      const key = monthKey(p.month || p.generatedAt);

      if (!map.has(key)) {
        map.set(key, { month: key, payroll: 0 });
      }

      map.get(key)!.payroll += Number(p.netSalary || 0);
    });

  return Array.from(map.values()).slice(-6);
}

function buildRevenueExpenseTrend(revenues: any[], expenses: any[]) {
  const map = new Map<string, { month: string; revenue: number; expense: number }>();

  revenues.forEach((r) => {
    const key = monthKey(r.revenueDate || r.date || r.createdAt);

    if (!map.has(key)) {
      map.set(key, { month: key, revenue: 0, expense: 0 });
    }

    map.get(key)!.revenue += Number(r.amount || 0);
  });

  expenses.forEach((e) => {
    const key = monthKey(e.expenseDate || e.date || e.createdAt);

    if (!map.has(key)) {
      map.set(key, { month: key, revenue: 0, expense: 0 });
    }

    map.get(key)!.expense += Number(e.amount || 0);
  });

  return Array.from(map.values()).slice(-6);
}

function EmptyChart() {
  return (
    <div className="grid h-full place-items-center text-sm text-muted-foreground">
      No data available
    </div>
  );
}

function Dashboard() {
  // The night shift crosses midnight, so "today" is the business day (rolls
  // over at noon), not the calendar day — a 1 AM shift still counts as today's.
  const businessDate = useCurrentBusinessDate();
  const employeesQuery = useEmployees();
  const attendanceQuery = useAttendance();

  const leavesQuery = useQuery({
    queryKey: ["leaveRequests"],
    queryFn: getLeaveRequests,
  });

  const payrollQuery = useQuery({
    queryKey: ["payroll"],
    queryFn: getPayroll,
  });

  const revenueQuery = useQuery({
    queryKey: ["revenue"],
    queryFn: getRevenue,
  });

  const expensesQuery = useQuery({
    queryKey: ["expenses"],
    queryFn: getExpenses,
  });

  const reserveQuery = useQuery({
    queryKey: ["reserveLedger"],
    queryFn: getReserveLedger,
  });

  const isLoading =
    employeesQuery.isLoading ||
    attendanceQuery.isLoading ||
    leavesQuery.isLoading ||
    payrollQuery.isLoading ||
    revenueQuery.isLoading ||
    expensesQuery.isLoading ||
    reserveQuery.isLoading;

  const error =
    employeesQuery.error ||
    attendanceQuery.error ||
    leavesQuery.error ||
    payrollQuery.error ||
    revenueQuery.error ||
    expensesQuery.error ||
    reserveQuery.error;

  if (isLoading) {
    return (
      <div>
        <PageHeader eyebrow="Admin" title="Dashboard" description="Loading live HRMS data..." />
        <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
          Loading dashboard...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader eyebrow="Admin" title="Dashboard" description="Live HRMS overview." />
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {error instanceof Error ? error.message : "Something went wrong"}
        </div>
      </div>
    );
  }

  const employees = safeArray<any>(employeesQuery.data);
  function getEmployeeName(employeeId?: string) {
    const employee = employees.find((e) => e.employeeId === employeeId);
    return employee?.name || employeeId || "Unknown";
  }
  const attendanceRecords = safeArray<any>(attendanceQuery.data);
  const leaveRequests = safeArray<any>(leavesQuery.data);
  const payrollRecords = safeArray<any>(payrollQuery.data);
  const revenues = safeArray<any>(revenueQuery.data);
  const expenses = safeArray<any>(expensesQuery.data);
  const reserveLedger = safeArray<any>(reserveQuery.data);

  const todayAttendance = attendanceRecords.filter((a) =>
    isCurrentShift(a.attendanceDate || a.checkIn, businessDate)
  );

  const totalEmployees = employees.length;
  const presentToday = todayAttendance.filter((a) => a.attendanceStatus === "Present").length;
  const absentToday = todayAttendance.filter((a) => a.attendanceStatus === "Absent").length;
  const lateToday = todayAttendance.filter((a) => isLate(a.isLate)).length;
  const pendingLeaves = leaveRequests.filter((l) => l.status === "Pending").length;

  const activePayroll = payrollRecords.filter((p) => p.status !== "Cancelled");

  // The tiles below say "Monthly", so they count the current month only.
  const currentMonth = businessDate.slice(0, 7);

  const monthlyPayroll = activePayroll
    .filter((p) => isInMonth(p.month || p.generatedAt, currentMonth))
    .reduce((sum, p) => sum + Number(p.netSalary || 0), 0);

  const monthlyRevenue = revenues
    .filter((r) => isInMonth(r.revenueDate || r.date || r.createdAt, currentMonth))
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);

  const monthlyExpenses = expenses
    .filter((e) => isInMonth(e.expenseDate || e.date || e.createdAt, currentMonth))
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const monthlyProfit = monthlyRevenue - monthlyExpenses - monthlyPayroll;

  // The ledger arrives newest-first; pick by timestamp so either order works.
  const latestReserve = reserveLedger.reduce<ReserveTransaction | null>(
    (latest, row) =>
      !latest ||
      new Date(row.createdAt ?? 0).getTime() >= new Date(latest.createdAt ?? 0).getTime()
        ? row
        : latest,
    null
  );

  const reserveBalance = Number(latestReserve?.balanceAfter || 0);

  const attendanceTrend = buildAttendanceTrend(attendanceRecords);
  const payrollTrend = buildPayrollTrend(payrollRecords);
  const revenueExpenseTrend = buildRevenueExpenseTrend(revenues, expenses);

  const reserveAmount = Math.max(0, monthlyProfit * 0.3);
  const partnerShare = Math.max(0, monthlyProfit * 0.2);
  const retained = Math.max(0, monthlyProfit - reserveAmount - partnerShare * 3);

  const profitDistribution = [
    { name: "Reserve", percent: monthlyProfit > 0 ? 30 : 0, amount: reserveAmount, color: "var(--color-chart-1)" },
    { name: "Partner A", percent: monthlyProfit > 0 ? 20 : 0, amount: partnerShare, color: "var(--color-chart-2)" },
    { name: "Partner B", percent: monthlyProfit > 0 ? 20 : 0, amount: partnerShare, color: "var(--color-chart-3)" },
    { name: "Partner C", percent: monthlyProfit > 0 ? 20 : 0, amount: partnerShare, color: "var(--color-chart-4)" },
    { name: "Retained", percent: monthlyProfit > 0 ? 10 : 0, amount: retained, color: "var(--color-chart-5)" },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Good morning, Admin"
        description="Here's what's happening across your organization today."
        actions={
          <>
            <Button variant="outline" size="sm">
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Export
            </Button>
            <Button size="sm" asChild>
              <Link to="/employees/create">Add Employee</Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Total Employees" value={String(totalEmployees)} icon={Users} tone="accent" />
        <StatCard label="Present Today" value={String(presentToday)} icon={UserCheck} tone="success" />
        <StatCard label="Absent Today" value={String(absentToday)} icon={UserX} tone="danger" />
        <StatCard label="Late Today" value={String(lateToday)} icon={Clock} tone="warning" />
        <StatCard label="Pending Leaves" value={String(pendingLeaves)} icon={CalendarClock} tone="accent" />
      </div>

      <div className="mt-3 sm:mt-4 grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Monthly Payroll" value={formatPKRCompact(monthlyPayroll)} icon={Wallet} tone="accent" />
        <StatCard label="Monthly Revenue" value={formatPKRCompact(monthlyRevenue)} icon={TrendingUp} tone="success" />
        <StatCard label="Monthly Expenses" value={formatPKRCompact(monthlyExpenses)} icon={TrendingDown} tone="warning" />
        <StatCard label="Monthly Profit" value={formatPKRCompact(monthlyProfit)} icon={BadgeDollarSign} tone={monthlyProfit >= 0 ? "success" : "danger"} />
        <StatCard label="Reserve Balance" value={formatPKRCompact(reserveBalance)} icon={PiggyBank} tone="accent" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartCard title="Attendance Trend" description="Monthly attendance breakdown">
            {attendanceTrend.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer>
                <AreaChart data={attendanceTrend}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
                  <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }} />
                  <Area type="monotone" dataKey="present" stroke="var(--color-chart-1)" fill="url(#g1)" strokeWidth={2} />
                  <Line type="monotone" dataKey="late" stroke="var(--color-chart-3)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        <ChartCard title="Profit Distribution" description="Current snapshot">
          {monthlyProfit <= 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer>
              <PieChart>
                <Pie data={profitDistribution} dataKey="percent" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={3}>
                  {profitDistribution.map((s, i) => (
                    <Cell key={i} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ChartCard title="Payroll Trend" description="Last 6 months">
          {payrollTrend.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer>
              <BarChart data={payrollTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickFormatter={(v) => `${(Number(v) / 1000000).toFixed(1)}M`} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }} formatter={(v: number) => formatPKR(v)} />
                <Bar dataKey="payroll" fill="var(--color-chart-1)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Revenue vs Expense" description="Track profitability">
          {revenueExpenseTrend.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer>
              <LineChart data={revenueExpenseTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickFormatter={(v) => `${(Number(v) / 1000000).toFixed(1)}M`} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }} formatter={(v: number) => formatPKR(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="revenue" stroke="var(--color-chart-2)" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="expense" stroke="var(--color-chart-4)" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border bg-card p-5">
          <SectionHeader title="Recent Attendance" />
          {attendanceRecords.length === 0 ? (
            <p className="text-sm text-muted-foreground">No attendance records.</p>
          ) : (
            <ul className="space-y-3">
              {attendanceRecords.slice(0, 5).map((a) => (
                <li key={a.attendanceId} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{a.employeeName || getEmployeeName(a.employeeId)}</p>
                    <p className="text-xs text-muted-foreground">{formatTime(a.checkIn)} → {formatTime(a.checkOut)}</p>
                  </div>
                  <StatusBadge status={a.attendanceStatus || "—"} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border bg-card p-5">
          <SectionHeader title="Recent Leave Requests" />
          {leaveRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No leave requests.</p>
          ) : (
            <ul className="space-y-3">
              {leaveRequests.slice(0, 5).map((l) => (
                <li key={l.leaveId} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{l.employeeName || getEmployeeName(l.employeeId)}</p>
                    <p className="text-xs text-muted-foreground capitalize">{l.leaveType} • {Number(l.totalDays || 0)}d</p>
                  </div>
                  <StatusBadge status={l.status || "—"} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border bg-card p-5">
          <SectionHeader title="Recent Expenses" />
          {expenses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No expenses recorded.</p>
          ) : (
            <ul className="space-y-3">
              {expenses.slice(0, 5).map((e) => (
                <li key={e.expenseId} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{e.description || "Expense"}</p>
                    <p className="text-xs text-muted-foreground">{e.category} • {e.expenseDate}</p>
                  </div>
                  <span className="font-medium tabular-nums">{formatPKR(e.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}