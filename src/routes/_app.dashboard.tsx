import type React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { IconTile } from "@/components/shared/IconTile";
import { useAuth } from "@/lib/auth/AuthContext";
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
  Plus,
  Info,
  LayoutDashboard,
  BarChart3,
  CalendarDays,
  Receipt,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
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
  getAccountsOverview,
  getExpenses,
  getRevenue,
  getReserveLedger,
  type Expense,
  type ProfitDistributionItem,
  type ReserveTransaction,
  type Revenue,
} from "@/lib/api/accounts";
import type { AttendanceRecord } from "@/lib/api/attendance";
import type { Employee } from "@/lib/api/employees";
import type { LeaveRequest } from "@/lib/api/leaves";
import type { PayrollRecord } from "@/lib/api/payroll";
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

/** Sortable "YYYY-MM" key plus a short "Oct 26" label for chart axes. */
function monthBucket(value?: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    const key = String(value).slice(0, 7);
    return /^\d{4}-\d{2}$/.test(key) ? { key, label: key } : null;
  }
  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  const label = date.toLocaleDateString("en-PK", { month: "short", year: "2-digit" });
  return { key, label };
}

/** Last six months in calendar order, whatever order the API returned rows in. */
function lastSixMonths<T>(map: Map<string, T>) {
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([, v]) => v);
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

function buildAttendanceTrend(records: AttendanceRecord[]) {
  const map = new Map<string, { month: string; present: number; late: number }>();

  records.forEach((r) => {
    const bucket = monthBucket(r.attendanceDate || r.checkIn);
    if (!bucket) return;
    if (!map.has(bucket.key)) map.set(bucket.key, { month: bucket.label, present: 0, late: 0 });

    const item = map.get(bucket.key)!;
    if (r.attendanceStatus === "Present") item.present += 1;
    if (isLate(r.isLate)) item.late += 1;
  });

  return lastSixMonths(map);
}

function buildPayrollTrend(records: PayrollRecord[]) {
  const map = new Map<string, { month: string; payroll: number }>();

  records
    .filter((p) => p.status !== "Cancelled")
    .forEach((p) => {
      const bucket = monthBucket(p.month || p.generatedAt);
      if (!bucket) return;
      if (!map.has(bucket.key)) map.set(bucket.key, { month: bucket.label, payroll: 0 });
      map.get(bucket.key)!.payroll += Number(p.netSalary || 0);
    });

  return lastSixMonths(map);
}

function buildRevenueExpenseTrend(revenues: Revenue[], expenses: Expense[]) {
  const map = new Map<string, { month: string; revenue: number; expense: number }>();
  const add = (value: string | undefined, field: "revenue" | "expense", amount: unknown) => {
    const bucket = monthBucket(value);
    if (!bucket) return;
    if (!map.has(bucket.key)) map.set(bucket.key, { month: bucket.label, revenue: 0, expense: 0 });
    map.get(bucket.key)![field] += Number(amount || 0);
  };

  revenues.forEach((r) => add(r.revenueDate || r.createdAt, "revenue", r.amount));
  expenses.forEach((e) => add(e.expenseDate || e.createdAt, "expense", e.amount));

  return lastSixMonths(map);
}

function EmptyChart({ note = "No data for this period yet." }: { note?: string }) {
  return (
    <div className="flex h-full items-center justify-center gap-1.5 text-xs text-muted-foreground">
      <Info className="size-3.5 shrink-0" />
      {note}
    </div>
  );
}

// Figma chart styling: dashed horizontal grid, Geist Mono 11px muted ticks, no axis lines.
const gridProps = {
  strokeDasharray: "4 4",
  stroke: "var(--color-divider)",
  vertical: false,
} as const;
const axisProps = {
  stroke: "var(--color-muted-foreground)",
  tick: { fontSize: 11, fontFamily: "var(--font-mono)", fill: "var(--color-muted-foreground)" },
  tickLine: false,
  axisLine: false,
} as const;
const tooltipStyle = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  fontSize: 12,
  boxShadow: "0 1px 2px rgb(0 0 0 / 0.04)",
};
const millions = (v: number) => `${(Number(v) / 1000000).toFixed(1)}M`;

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/** Figma "List Row": name over a muted detail line, trailing badge or amount. */
function ListRow({
  title,
  detail,
  trailing,
}: {
  title: string;
  detail: string;
  trailing: React.ReactNode;
}) {
  return (
    <li className="flex items-center justify-between gap-3 border-b border-divider px-5 py-3 last:border-0">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{detail}</p>
      </div>
      {trailing}
    </li>
  );
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
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

  // The real profit split (partners, reserve, sadqah…) comes from the backend;
  // the Accounts pages read the same query.
  const overviewQuery = useQuery({
    queryKey: ["accountsOverview"],
    queryFn: getAccountsOverview,
  });

  const { user, employee } = useAuth();
  const firstName = (employee?.name || user?.username || "Admin").split(" ")[0];

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
        <PageHeader
          icon={LayoutDashboard}
          title="Dashboard"
          description="Loading live HRMS data…"
        />
        <div className="rounded-2xl border bg-card p-6 text-[13px] text-muted-foreground">
          Loading dashboard…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader icon={LayoutDashboard} title="Dashboard" description="Live HRMS overview." />
        <div
          role="alert"
          className="rounded-2xl border border-danger-line bg-danger-tint p-6 text-[13px] text-danger-ink"
        >
          {error instanceof Error ? error.message : "Something went wrong"}
        </div>
      </div>
    );
  }

  const employees = safeArray<Employee>(employeesQuery.data);
  function getEmployeeName(employeeId?: string) {
    const employee = employees.find((e) => e.employeeId === employeeId);
    return employee?.name || employeeId || "Unknown";
  }
  const attendanceRecords = safeArray<AttendanceRecord>(attendanceQuery.data);
  const leaveRequests = safeArray<LeaveRequest>(leavesQuery.data);
  const payrollRecords = safeArray<PayrollRecord>(payrollQuery.data);
  const revenues = safeArray<Revenue>(revenueQuery.data);
  const expenses = safeArray<Expense>(expensesQuery.data);
  const reserveLedger = safeArray<ReserveTransaction>(reserveQuery.data);

  const todayAttendance = attendanceRecords.filter((a) =>
    isCurrentShift(a.attendanceDate || a.checkIn, businessDate),
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
    .filter((r) => isInMonth(r.revenueDate || r.createdAt, currentMonth))
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);

  const monthlyExpenses = expenses
    .filter((e) => isInMonth(e.expenseDate || e.createdAt, currentMonth))
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  // Paid salaries are already posted to expenses, so payroll isn't subtracted again.
  const monthlyProfit = monthlyRevenue - monthlyExpenses;

  // The ledger arrives newest-first; pick by timestamp so either order works.
  const latestReserve = reserveLedger.reduce<ReserveTransaction | null>(
    (latest, row) =>
      !latest || new Date(row.createdAt ?? 0).getTime() >= new Date(latest.createdAt ?? 0).getTime()
        ? row
        : latest,
    null,
  );

  const reserveBalance = Number(latestReserve?.balanceAfter || 0);

  const attendanceTrend = buildAttendanceTrend(attendanceRecords);
  const payrollTrend = buildPayrollTrend(payrollRecords);
  const revenueExpenseTrend = buildRevenueExpenseTrend(revenues, expenses);

  const distributionColors = ["bg-info", "bg-success", "bg-warning", "bg-violet", "bg-destructive"];
  const profitDistribution = safeArray<ProfitDistributionItem>(overviewQuery.data?.distribution)
    .map((d, i) => ({
      name: String(d.name || "—"),
      percent: Number(d.percent || 0),
      amount: Number(d.amount || 0),
      color: distributionColors[i % distributionColors.length],
    }))
    .filter((d) => d.amount > 0 || d.percent > 0);

  const monthLabel = new Date(`${currentMonth}-01T00:00:00`).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  const exportSummary = () =>
    downloadCsv(`dashboard-${currentMonth}.csv`, [
      ["Metric", "Value"],
      ["Total employees", totalEmployees],
      ["Present today", presentToday],
      ["Absent today", absentToday],
      ["Late today", lateToday],
      ["Pending leaves", pendingLeaves],
      [`Payroll (${monthLabel})`, monthlyPayroll],
      [`Revenue (${monthLabel})`, monthlyRevenue],
      [`Expenses (${monthLabel})`, monthlyExpenses],
      [`Profit (${monthLabel})`, monthlyProfit],
      ["Reserve balance", reserveBalance],
    ]);

  return (
    <div className="space-y-4">
      <PageHeader
        icon={LayoutDashboard}
        title={`${greeting()}, ${firstName}`}
        description="Here's what's happening across your organization today."
        actions={
          <>
            <Button variant="outline" onClick={exportSummary}>
              <Download />
              Export
            </Button>
            <Button asChild>
              <Link to="/employees/create">
                <Plus />
                Add Employee
              </Link>
            </Button>
          </>
        }
      />

      <div className="metric-strip grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Total Employees" value={String(totalEmployees)} icon={Users} />
        <StatCard label="Present Today" value={String(presentToday)} icon={UserCheck} />
        <StatCard label="Absent Today" value={String(absentToday)} icon={UserX} />
        <StatCard label="Late Today" value={String(lateToday)} icon={Clock} />
        <StatCard label="Pending Leaves" value={String(pendingLeaves)} icon={CalendarClock} />
        <StatCard label="Monthly Payroll" value={formatPKRCompact(monthlyPayroll)} icon={Wallet} />
        <StatCard
          label="Monthly Revenue"
          value={formatPKRCompact(monthlyRevenue)}
          icon={TrendingUp}
        />
        <StatCard
          label="Monthly Expenses"
          value={formatPKRCompact(monthlyExpenses)}
          icon={TrendingDown}
        />
        <StatCard
          label="Monthly Profit"
          value={formatPKRCompact(monthlyProfit)}
          icon={BadgeDollarSign}
        />
        <StatCard
          label="Reserve Balance"
          value={formatPKRCompact(reserveBalance)}
          icon={PiggyBank}
        />
      </div>

      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <Info className="mt-px size-3.5 shrink-0" />
        Monthly figures cover {monthLabel}. Monthly profit = revenue − expenses; expenses include
        salaries once payroll is marked paid.
      </p>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <ChartCard
            icon={BarChart3}
            title="Attendance Trend"
            description="Monthly attendance breakdown"
          >
            {attendanceTrend.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer>
                <AreaChart
                  data={attendanceTrend}
                  margin={{ top: 4, right: 20, left: -12, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="month" {...axisProps} />
                  <YAxis {...axisProps} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area
                    type="monotone"
                    dataKey="present"
                    name="Present"
                    stroke="var(--color-chart-1)"
                    fill="url(#g1)"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="late"
                    name="Late"
                    stroke="var(--color-chart-3)"
                    strokeWidth={2}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        <ChartCard
          icon={BadgeDollarSign}
          tone="violet"
          title="Profit Distribution"
          description="Current snapshot"
          bodyClassName=""
        >
          {profitDistribution.length === 0 ? (
            <div className="h-64">
              <EmptyChart note="No profit to distribute yet." />
            </div>
          ) : (
            <div className="space-y-[18px]">
              {profitDistribution.map((d) => (
                <div key={d.name} className="space-y-1.5">
                  <div className="flex items-start justify-between gap-3 text-[13px] font-medium leading-[18px]">
                    <span className="truncate">{d.name}</span>
                    <span className="font-mono">{formatPKR(d.amount)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-divider">
                    <div
                      className={`h-full rounded-full ${d.color}`}
                      style={{ width: `${Math.min(100, d.percent)}%` }}
                    />
                  </div>
                  <p className="font-mono text-xs text-muted-foreground">{d.percent}%</p>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard icon={Wallet} title="Payroll Trend" description={monthLabel}>
          {payrollTrend.length < 2 ? (
            <div className="flex h-full flex-col justify-center gap-1">
              <p className="font-mono text-[26px] font-medium leading-8 tracking-[-0.8px]">
                {formatPKR(monthlyPayroll)}
              </p>
              <p className="text-[13px] text-muted-foreground">Total payroll for {monthLabel}</p>
              <p className="flex items-start gap-1.5 pt-3 text-xs text-muted-foreground">
                <Info className="mt-px size-3.5 shrink-0" />A trend line appears once there are two
                or more months of payroll.
              </p>
            </div>
          ) : (
            <ResponsiveContainer>
              <BarChart data={payrollTrend} margin={{ top: 4, right: 20, left: -4, bottom: 0 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="month" {...axisProps} />
                <YAxis {...axisProps} tickFormatter={millions} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: "var(--color-subtle)" }}
                  formatter={(v: number) => formatPKR(v)}
                />
                <Bar
                  dataKey="payroll"
                  name="Payroll"
                  fill="var(--color-chart-1)"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          icon={TrendingUp}
          tone="success"
          title="Revenue vs Expense"
          description="Track profitability"
        >
          {revenueExpenseTrend.length === 0 ? (
            <EmptyChart />
          ) : (
            <div className="flex h-full flex-col">
              <div className="min-h-0 flex-1">
                <ResponsiveContainer>
                  <LineChart
                    data={revenueExpenseTrend}
                    margin={{ top: 4, right: 20, left: -4, bottom: 0 }}
                  >
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="month" {...axisProps} />
                    <YAxis {...axisProps} tickFormatter={millions} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatPKR(v)} />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      name="Revenue"
                      stroke="var(--color-success)"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "var(--color-card)" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="expense"
                      name="Expense"
                      stroke="var(--color-destructive)"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "var(--color-card)" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-4 pt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-[2px] bg-success" />
                  Revenue
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-[2px] bg-destructive" />
                  Expense
                </span>
              </div>
            </div>
          )}
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ListCard
          icon={Clock}
          tone="warning"
          title="Recent Attendance"
          description="Latest check-ins"
        >
          {attendanceRecords.length === 0 ? (
            <EmptyState icon={Clock} title="No attendance records" />
          ) : (
            <ul>
              {attendanceRecords.slice(0, 5).map((a) => (
                <ListRow
                  key={a.attendanceId}
                  title={a.employeeName || getEmployeeName(a.employeeId)}
                  detail={`${formatTime(a.checkIn)} → ${a.checkOut ? formatTime(a.checkOut) : "—"}`}
                  trailing={<StatusBadge status={a.attendanceStatus || "—"} />}
                />
              ))}
            </ul>
          )}
        </ListCard>

        <ListCard
          icon={CalendarDays}
          tone="violet"
          title="Recent Leave Requests"
          description="Latest 5"
        >
          {leaveRequests.length === 0 ? (
            <EmptyState icon={CalendarDays} title="No leave requests" />
          ) : (
            <ul>
              {leaveRequests.slice(0, 5).map((l) => (
                <ListRow
                  key={l.leaveId}
                  title={l.employeeName || getEmployeeName(l.employeeId)}
                  detail={`${l.leaveType || "Leave"} • ${Number(l.totalDays || 0)}d`}
                  trailing={<StatusBadge status={l.status || "—"} />}
                />
              ))}
            </ul>
          )}
        </ListCard>

        <ListCard icon={Receipt} tone="danger" title="Recent Expenses" description="Latest 5">
          {expenses.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No expenses recorded"
              action={
                <Button variant="outline" size="sm" asChild>
                  <Link to="/accounts/expenses">
                    <Plus />
                    Record expense
                  </Link>
                </Button>
              }
            />
          ) : (
            <ul>
              {expenses.slice(0, 5).map((e) => (
                <ListRow
                  key={e.expenseId}
                  title={e.description || "Expense"}
                  detail={`${e.category || "—"} • ${e.expenseDate || "—"}`}
                  trailing={
                    <span className="shrink-0 font-mono text-[13px] font-medium">
                      {formatPKR(e.amount)}
                    </span>
                  }
                />
              ))}
            </ul>
          )}
        </ListCard>
      </div>
    </div>
  );
}

/** Card with an icon-tile header whose body is a flush list (or a padded empty state). */
function ListCard({
  icon,
  tone,
  title,
  description,
  children,
}: {
  icon: React.ComponentProps<typeof IconTile>["icon"];
  tone: React.ComponentProps<typeof IconTile>["tone"];
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-card">
      <div className="flex items-center gap-2.5 border-b border-divider px-5 py-3.5">
        <IconTile icon={icon} tone={tone} />
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold leading-5 tracking-[-0.2px]">{title}</h3>
          <p className="truncate text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="flex-1 [&>div]:m-5">{children}</div>
    </div>
  );
}
