import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { ChartCard } from "@/components/shared/ChartCard";
import { formatPKR, revenueExpenseTrend, profitDistribution } from "@/lib/mock-data";
import { TrendingUp, TrendingDown, PiggyBank, BadgeDollarSign } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/_app/accounts")({
  component: AccountsLayout,
});

function AccountsLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const tabs = [
    { url: "/accounts", label: "Overview" },
    { url: "/accounts/revenue", label: "Revenue" },
    { url: "/accounts/expenses", label: "Expenses" },
    { url: "/accounts/reserve", label: "Reserve" },
    { url: "/accounts/profit-distribution", label: "Profit Distribution" },
  ];
  const isRoot = path === "/accounts";
  return (
    <div>
      <PageHeader title="Accounts" description="Revenue, expenses, reserve and profit distribution." />
      <div className="mb-6 inline-flex rounded-xl border bg-card p-1 overflow-x-auto">
        {tabs.map((t) => {
          const active = path === t.url;
          return <Link key={t.url} to={t.url} className={`whitespace-nowrap rounded-lg px-3.5 py-1.5 text-xs font-medium transition ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{t.label}</Link>;
        })}
      </div>
      {isRoot ? <Overview /> : <Outlet />}
    </div>
  );
}

function Overview() {
  return (
    <>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Revenue (MTD)" value={formatPKR(4930000)} icon={TrendingUp} trend={12} tone="success" />
        <StatCard label="Expenses (MTD)" value={formatPKR(3120000)} icon={TrendingDown} trend={-5} tone="warning" />
        <StatCard label="Net Profit" value={formatPKR(1810000)} icon={BadgeDollarSign} trend={18} tone="success" />
        <StatCard label="Reserve" value={formatPKR(4800000)} icon={PiggyBank} trend={11} tone="accent" />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartCard title="Revenue vs Expenses" description="Last 6 months">
            <ResponsiveContainer>
              <AreaChart data={revenueExpenseTrend}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={0.45} /><stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity={0} /></linearGradient>
                  <linearGradient id="exp" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-chart-4)" stopOpacity={0.45} /><stop offset="100%" stopColor="var(--color-chart-4)" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickFormatter={(v) => `${(v/1000000).toFixed(1)}M`} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }} formatter={(v: number) => formatPKR(v)} />
                <Area type="monotone" dataKey="revenue" stroke="var(--color-chart-2)" fill="url(#rev)" strokeWidth={2.5} />
                <Area type="monotone" dataKey="expense" stroke="var(--color-chart-4)" fill="url(#exp)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
        <div className="rounded-2xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4">Distribution snapshot</h3>
          <ul className="space-y-3">
            {profitDistribution.map((p) => (
              <li key={p.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{p.name}</span><span className="tabular-nums">{formatPKR(p.amount)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${p.percent}%`, background: p.color }} />
                </div>
                <p className="text-[11px] text-muted-foreground">{p.percent}%</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
