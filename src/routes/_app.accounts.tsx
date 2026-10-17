import { useMemo, useState } from "react";
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { ChartCard } from "@/components/shared/ChartCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Input } from "@/components/ui/input";
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
  getExpenses,
  getRevenue,
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

type RangeKey =
  | "all"
  | "thisMonth"
  | "lastMonth"
  | "last3"
  | "last6"
  | "custom";

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "all", label: "All time" },
  { key: "thisMonth", label: "This month" },
  { key: "lastMonth", label: "Last month" },
  { key: "last3", label: "Last 3 months" },
  { key: "last6", label: "Last 6 months" },
  { key: "custom", label: "Custom range" },
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** "YYYY-MM-DD" in the viewer's local time zone (not UTC). */
function ymd(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function prettyDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
}

/** Inclusive [start, end] YYYY-MM-DD bounds for a preset, or null for all-time. */
function rangeBounds(
  key: RangeKey,
  customStart: string,
  customEnd: string,
): { start: string; end: string } | null {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const firstOf = (year: number, month: number) => ymd(new Date(year, month, 1));
  const lastOf = (year: number, month: number) => ymd(new Date(year, month + 1, 0));

  switch (key) {
    case "all":
      return null;
    case "thisMonth":
      return { start: firstOf(y, m), end: ymd(now) };
    case "lastMonth":
      return { start: firstOf(y, m - 1), end: lastOf(y, m - 1) };
    case "last3":
      return { start: firstOf(y, m - 2), end: ymd(now) };
    case "last6":
      return { start: firstOf(y, m - 5), end: ymd(now) };
    case "custom":
      if (!customStart || !customEnd) return null;
      return customStart <= customEnd
        ? { start: customStart, end: customEnd }
        : { start: customEnd, end: customStart };
  }
}

function Overview() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["accountsOverview"],
    queryFn: getAccountsOverview,
  });
  const { data: revenues = [] } = useQuery({
    queryKey: ["revenue"],
    queryFn: getRevenue,
  });
  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: getExpenses,
  });

  const [rangeKey, setRangeKey] = useState<RangeKey>("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const bounds = rangeBounds(rangeKey, customStart, customEnd);

  const ranged = useMemo(() => {
    const inRange = (dateStr?: string) => {
      if (!bounds) return true;
      const d = String(dateStr || "").slice(0, 10);
      return d >= bounds.start && d <= bounds.end;
    };
    const revenue = revenues
      .filter((r) => inRange(r.revenueDate))
      .reduce((s, r) => s + Number(r.amount || 0), 0);
    const expense = expenses
      .filter((e) => inRange(e.expenseDate))
      .reduce((s, e) => s + Number(e.amount || 0), 0);
    return { revenue, expense, profit: revenue - expense };
  }, [revenues, expenses, bounds]);

  if (isLoading) {
    return (
      <div className="rounded-2xl border bg-card p-6 text-[13px] text-muted-foreground">
        Loading accounts overview...
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="rounded-lg border border-danger-line bg-danger-tint p-4 text-[13px] text-danger-ink">
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

  const isAllTime = rangeKey === "all";

  // Reserve share comes from the configured distribution (defaults to 30%).
  const reservePct =
    distribution.find((d) => /reserve/i.test(d.name))?.percent ?? 30;

  const cardValues = isAllTime
    ? {
        revenue: summary.totalRevenue,
        expenses: summary.totalExpenses,
        profit: summary.netProfit,
        reserve: summary.reserveBalance,
      }
    : {
        revenue: ranged.revenue,
        expenses: ranged.expense,
        profit: ranged.profit,
        reserve: ranged.profit > 0 ? (ranged.profit * reservePct) / 100 : 0,
      };

  const rangeLabel =
    RANGE_OPTIONS.find((o) => o.key === rangeKey)?.label ?? "All time";
  const cardLabelSuffix = isAllTime
    ? "All time"
    : bounds
      ? `${prettyDate(bounds.start)} – ${prettyDate(bounds.end)}`
      : rangeLabel;

  // Distribution amounts reflect the profit of the selected range.
  const distributionForRange = distribution.map((d) => ({
    ...d,
    amount: Math.round((cardValues.profit * d.percent) / 100),
  }));

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold leading-5 tracking-[-0.2px]">
            {rangeLabel} summary
          </h3>
          <p className="text-xs text-muted-foreground">
            {isAllTime
              ? "Showing all-time account totals"
              : `Showing ${cardLabelSuffix}`}
          </p>
        </div>

        <div className="flex w-full flex-wrap items-end gap-2 sm:w-auto">
          <div className="w-full space-y-1.5 sm:w-[200px]">
            <Label htmlFor="accounts-period">Period</Label>
            <Select
              value={rangeKey}
              onValueChange={(v) => setRangeKey(v as RangeKey)}
            >
              <SelectTrigger id="accounts-period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RANGE_OPTIONS.map((o) => (
                  <SelectItem key={o.key} value={o.key}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {rangeKey === "custom" && (
            <>
              <div className="min-w-0 flex-1 space-y-1.5 sm:w-[160px] sm:flex-none">
                <Label htmlFor="accounts-period-from">From</Label>
                <Input
                  id="accounts-period-from"
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                />
              </div>
              <div className="min-w-0 flex-1 space-y-1.5 sm:w-[160px] sm:flex-none">
                <Label htmlFor="accounts-period-to">To</Label>
                <Input
                  id="accounts-period-to"
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                />
              </div>
            </>
          )}
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
          {distributionForRange.length === 0 ? (
            <EmptyState icon={ChartPie} title="No distribution data available." />
          ) : (
            <ul className="space-y-4">
              {distributionForRange.map((p, i) => (
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
