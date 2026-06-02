import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, SectionHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { ChartCard } from "@/components/shared/ChartCard";
import { Button } from "@/components/ui/button";
import {
  Users, UserCheck, UserX, Clock, CalendarClock, Wallet,
  TrendingUp, TrendingDown, PiggyBank, BadgeDollarSign, Download,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import {
  attendanceTrend, payrollTrend, revenueExpenseTrend, profitDistribution,
  formatPKR, leaveRequests, expenses, attendanceRecords,
} from "@/lib/mock-data";
import { StatusBadge } from "@/components/shared/StatusBadge";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Nexus HRMS" }] }),
  component: Dashboard,
});

function Dashboard() {
  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Good morning, Ayesha"
        description="Here's what's happening across your organization today."
        actions={
          <>
            <Button variant="outline" size="sm"><Download className="mr-1.5 h-3.5 w-3.5" />Export</Button>
            <Button size="sm" asChild><Link to="/employees/create">Add Employee</Link></Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Total Employees" value="48" icon={Users} trend={6} hint="vs last month" tone="accent" />
        <StatCard label="Present Today" value="41" icon={UserCheck} trend={3} tone="success" />
        <StatCard label="Absent Today" value="3" icon={UserX} trend={-1} tone="danger" />
        <StatCard label="Late Today" value="4" icon={Clock} trend={2} tone="warning" />
        <StatCard label="Pending Leaves" value="7" icon={CalendarClock} hint="3 awaiting today" tone="accent" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Monthly Payroll" value={formatPKR(2480000)} icon={Wallet} trend={4} tone="accent" />
        <StatCard label="Monthly Revenue" value={formatPKR(4930000)} icon={TrendingUp} trend={12} tone="success" />
        <StatCard label="Monthly Expenses" value={formatPKR(3120000)} icon={TrendingDown} trend={-5} tone="warning" />
        <StatCard label="Monthly Profit" value={formatPKR(1810000)} icon={BadgeDollarSign} trend={18} tone="success" />
        <StatCard label="Reserve Balance" value={formatPKR(4800000)} icon={PiggyBank} trend={11} tone="accent" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2"><ChartCard title="Attendance Trend" description="Monthly attendance breakdown">
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
        </ChartCard></div>

        <ChartCard title="Profit Distribution" description="June 2026">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={profitDistribution} dataKey="percent" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={3}>
                {profitDistribution.map((s, i) => <Cell key={i} fill={s.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ChartCard title="Payroll Trend" description="Last 6 months">
          <ResponsiveContainer>
            <BarChart data={payrollTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickFormatter={(v) => `${(v/1000000).toFixed(1)}M`} />
              <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }} formatter={(v: number) => formatPKR(v)} />
              <Bar dataKey="payroll" fill="var(--color-chart-1)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Revenue vs Expense" description="Track profitability">
          <ResponsiveContainer>
            <LineChart data={revenueExpenseTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickFormatter={(v) => `${(v/1000000).toFixed(1)}M`} />
              <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }} formatter={(v: number) => formatPKR(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="revenue" stroke="var(--color-chart-2)" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="expense" stroke="var(--color-chart-4)" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border bg-card p-5">
          <SectionHeader title="Recent Attendance" />
          <ul className="space-y-3">
            {attendanceRecords.slice(0, 5).map((a) => (
              <li key={a.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{a.employeeName}</p>
                  <p className="text-xs text-muted-foreground">{a.checkIn ?? "—"} → {a.checkOut ?? "—"}</p>
                </div>
                <StatusBadge status={a.status} />
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border bg-card p-5">
          <SectionHeader title="Recent Leave Requests" />
          <ul className="space-y-3">
            {leaveRequests.slice(0, 5).map((l) => (
              <li key={l.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{l.employeeName}</p>
                  <p className="text-xs text-muted-foreground capitalize">{l.type} • {l.days}d</p>
                </div>
                <StatusBadge status={l.status} />
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border bg-card p-5">
          <SectionHeader title="Recent Expenses" />
          <ul className="space-y-3">
            {expenses.slice(0, 5).map((e) => (
              <li key={e.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{e.description}</p>
                  <p className="text-xs text-muted-foreground">{e.category} • {e.date}</p>
                </div>
                <span className="font-medium tabular-nums">{formatPKR(e.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
