import { useState } from "react";
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { ChartCard } from "@/components/shared/ChartCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  TrendingDown,
  PiggyBank,
  CircleDollarSign,
  ChartColumn,
  ChartPie,
  Receipt,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import {
  getAccountsOverview,
  type ProfitDistributionItem,
  type RevenueExpenseTrendItem,
} from "@/lib/api/accounts";

export const Route = createFileRoute("/_app/accounts")({
  head: () => ({ meta: [{ title: "Accounts — LDS HRMS" }] }),
  component: AccountsLayout,
});

function formatPKR(value: number | string | undefined) {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(amount);
}

const axisTick = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fill: "var(--color-muted-foreground)",
};

const tooltipStyle = {
  background: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  fontSize: 12,
  boxShadow: "var(--shadow-xs)",
};

// Distribution bars cycle through the accent solids (blue, green, amber, red, violet).
const barColors = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

const dot = { r: 3, fill: "var(--color-card)", strokeWidth: 1.5 };

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
      <PageHeader
        icon={Receipt}
        title="Accounts"
        description="Revenue, expenses, reserve and profit distribution."
      />

      {/* Segmented sub-nav: same look as the Tabs primitive, but these are links. */}
      <nav className="mb-5 flex max-w-full gap-1 overflow-x-auto rounded-md bg-muted p-[3px] [-ms-overflow-style:none] [scrollbar-width:none] sm:inline-flex sm:gap-0 [&::-webkit-scrollbar]:hidden">
        {tabs.map((t) => {
          const active = path === t.url;

          return (
            <Link
              key={t.url}
              to={t.url}
              className={`inline-flex min-h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-[6px] px-3 py-1 text-[13px] font-medium transition-all sm:h-[26px] sm:min-h-0 ${
                active
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      {isRoot ? <Overview /> : <Outlet />}
    </div>
  );
}

function Overview() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["accountsOverview"],
    queryFn: getAccountsOverview,
  });
  const [viewMode, setViewMode] = useState<"overall" | "monthly">("overall");

  if (isLoading) {
    return (
      <div className="rounded-2xl border bg-card p-6 text-[13px] text-muted-foreground">
        Loading accounts overview...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-danger-line bg-danger-tint p-4 text-[13px] text-danger-ink">
        {error instanceof Error ? error.message : "Something went wrong"}
      </div>
    );
  }

  const summary = data?.summary ?? {
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    reserveBalance: 0,
  };

  const trend: RevenueExpenseTrendItem[] = data?.trend ?? [];
  const distribution: ProfitDistributionItem[] = data?.distribution ?? [];

  const selectedMonth = localMonthKey(); // local time, not UTC: avoids the previous month early on the 1st

  const currentMonthData = trend.find((t) => String(t.month).slice(0, 7) === selectedMonth);

  const monthlyRevenue = Number(currentMonthData?.revenue || 0);
  const monthlyExpense = Number(currentMonthData?.expense || 0);
  const monthlyProfit = monthlyRevenue - monthlyExpense;
  const monthlyReserve = monthlyProfit > 0 ? monthlyProfit * 0.3 : 0;
  const selectedMonthLabel = new Date(`${selectedMonth}-01`).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  const isMonthly = viewMode === "monthly";

  // The overall view shows all-time totals, so label them that way (was "MTD").
  const cardLabelSuffix = isMonthly ? selectedMonthLabel : "All time";

  const cardValues = isMonthly
    ? {
        revenue: monthlyRevenue,
        expenses: monthlyExpense,
        profit: monthlyProfit,
        reserve: monthlyReserve,
      }
    : {
        revenue: summary.totalRevenue,
        expenses: summary.totalExpenses,
        profit: summary.netProfit,
        reserve: summary.reserveBalance,
      };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold leading-5 tracking-[-0.2px]">
            {isMonthly ? "Monthly summary" : "All time summary"}
          </h3>
          <p className="text-xs text-muted-foreground">
            {isMonthly
              ? `Showing data for ${selectedMonthLabel}`
              : "Showing all-time account totals"}
          </p>
        </div>

        <div className="w-full space-y-1.5 sm:w-[200px]">
          <Label htmlFor="accounts-period">Period</Label>
          <Select value={viewMode} onValueChange={(v) => setViewMode(v as "overall" | "monthly")}>
            <SelectTrigger id="accounts-period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overall">All time</SelectItem>
              <SelectItem value="monthly">{selectedMonthLabel}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="metric-strip grid grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={`Revenue (${cardLabelSuffix})`}
          value={formatPKR(cardValues.revenue)}
          icon={TrendingUp}
          tone="success"
        />

        <StatCard
          label={`Expenses (${cardLabelSuffix})`}
          value={formatPKR(cardValues.expenses)}
          icon={TrendingDown}
          tone="warning"
        />

        <StatCard
          label={`Profit (${cardLabelSuffix})`}
          value={formatPKR(cardValues.profit)}
          icon={CircleDollarSign}
          tone={cardValues.profit >= 0 ? "accent" : "danger"}
        />

        <StatCard
          label={`Reserve (${cardLabelSuffix})`}
          value={formatPKR(cardValues.reserve)}
          icon={PiggyBank}
          tone="accent"
        />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <ChartCard
            icon={ChartColumn}
            tone="info"
            title="Revenue vs Expenses"
            description="Last 6 months"
            bodyClassName=""
          >
            <div className="h-64">
              <ResponsiveContainer>
                <LineChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
                  <CartesianGrid
                    strokeDasharray="4 4"
                    stroke="var(--color-divider)"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="month"
                    tick={axisTick}
                    axisLine={false}
                    tickLine={false}
                    tickMargin={8}
                  />

                  <YAxis
                    tick={axisTick}
                    axisLine={false}
                    tickLine={false}
                    width={48}
                    tickFormatter={(v) => `${(Number(v) / 1000000).toFixed(1)}M`}
                  />

                  <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{ stroke: "var(--color-border)" }}
                    formatter={(v: number) => formatPKR(v)}
                  />

                  <Line
                    type="linear"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="var(--color-success)"
                    strokeWidth={2}
                    dot={dot}
                    activeDot={{ r: 4 }}
                  />

                  <Line
                    type="linear"
                    dataKey="expense"
                    name="Expenses"
                    stroke="var(--color-destructive)"
                    strokeWidth={2}
                    dot={dot}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-[2px] bg-success" />
                Revenue
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-[2px] bg-destructive" />
                Expenses
              </span>
            </div>
          </ChartCard>
        </div>

        <ChartCard
          icon={ChartPie}
          tone="violet"
          title="Distribution snapshot"
          description="Share of net profit"
          bodyClassName=""
        >
          {distribution.length === 0 ? (
            <EmptyState icon={ChartPie} title="No distribution data available." />
          ) : (
            <ul className="space-y-4">
              {distribution.map((p, i) => (
                <li key={p.name} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-[13px] font-medium leading-[18px]">
                      {p.name}
                    </span>
                    <span className="font-mono text-[13px] font-medium tabular-nums">
                      {formatPKR(p.amount)}
                    </span>
                  </div>

                  <div className="h-1.5 overflow-hidden rounded-full bg-divider">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, Math.max(0, Number(p.percent) || 0))}%`,
                        background: barColors[i % barColors.length],
                      }}
                    />
                  </div>

                  <p className="font-mono text-xs text-muted-foreground">{p.percent}%</p>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>
      </div>
    </>
  );
}

/** "YYYY-MM" for the current month in the viewer's local time zone. */
function localMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
