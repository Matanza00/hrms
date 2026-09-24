import { useState } from "react";
import {  } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  createFileRoute,
  Link,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { ChartCard } from "@/components/shared/ChartCard";
import {
  TrendingUp,
  TrendingDown,
  PiggyBank,
  BadgeDollarSign,
  CalendarDays,
  BarChart3,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
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
        title="Accounts"
        description="Revenue, expenses, reserve and profit distribution."
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
      <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
        Loading accounts overview...
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

  const summary = data?.summary ?? {
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    reserveBalance: 0,
  };

  const trend: RevenueExpenseTrendItem[] = data?.trend ?? [];
  const distribution: ProfitDistributionItem[] = data?.distribution ?? [];

  const selectedMonth = new Date().toISOString().slice(0, 7);

  const currentMonthData = trend.find(
    (t) => String(t.month).slice(0, 7) === selectedMonth
  );

  const monthlyRevenue = Number(currentMonthData?.revenue || 0);
  const monthlyExpense = Number(currentMonthData?.expense || 0);
  const monthlyProfit = monthlyRevenue - monthlyExpense;
  const monthlyReserve = monthlyProfit > 0 ? monthlyProfit * 0.3 : 0;
  const selectedMonthLabel = new Date(
    `${selectedMonth}-01`
  ).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  const isMonthly = viewMode === "monthly";

  const cardLabelSuffix = isMonthly ? selectedMonthLabel : "MTD";

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
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">
            {isMonthly ? "Monthly Summary" : "Overall Summary"}
          </h3>
          <p className="text-xs text-muted-foreground">
            {isMonthly
              ? `Showing data for ${selectedMonthLabel}`
              : "Showing all-time account totals"}
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setViewMode((prev) => (prev === "overall" ? "monthly" : "overall"))
          }
        >
          {isMonthly ? (
            <>
              <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
              Show Overall
            </>
          ) : (
            <>
              <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
              Show Monthly
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
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
          icon={BadgeDollarSign}
          tone={cardValues.profit >= 0 ? "success" : "danger"}
        />

        <StatCard
          label={`Reserve (${cardLabelSuffix})`}
          value={formatPKR(cardValues.reserve)}
          icon={PiggyBank}
          tone="accent"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartCard title="Revenue vs Expenses" description="Last 6 months">
            <ResponsiveContainer>
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="var(--color-chart-2)"
                      stopOpacity={0.45}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--color-chart-2)"
                      stopOpacity={0}
                    />
                  </linearGradient>

                  <linearGradient id="exp" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="var(--color-chart-4)"
                      stopOpacity={0.45}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--color-chart-4)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                  vertical={false}
                />

                <XAxis
                  dataKey="month"
                  stroke="var(--color-muted-foreground)"
                  fontSize={11}
                />

                <YAxis
                  stroke="var(--color-muted-foreground)"
                  fontSize={11}
                  tickFormatter={(v) => `${(Number(v) / 1000000).toFixed(1)}M`}
                />

                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => formatPKR(v)}
                />

                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--color-chart-2)"
                  fill="url(#rev)"
                  strokeWidth={2.5}
                />

                <Area
                  type="monotone"
                  dataKey="expense"
                  stroke="var(--color-chart-4)"
                  fill="url(#exp)"
                  strokeWidth={2.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div className="rounded-2xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4">
            Distribution snapshot
          </h3>

          {distribution.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No distribution data available.
            </p>
          ) : (
            <ul className="space-y-3">
              {distribution.map((p) => (
                <li key={p.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{p.name}</span>
                    <span className="tabular-nums">
                      {formatPKR(p.amount)}
                    </span>
                  </div>

                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${p.percent}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-muted-foreground">
                    {p.percent}%
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        
      </div>
    </>
  );
}