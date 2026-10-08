import { useMemo, useState } from "react";
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
  getExpenses,
  getRevenue,
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

      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border bg-card shadow-xs p-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:inline-flex [&::-webkit-scrollbar]:hidden">
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
      <div className="rounded-2xl border bg-card shadow-xs p-6 text-sm text-muted-foreground">
        Loading accounts overview...
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="rounded-2xl border border-destructive/25 bg-destructive/10 p-6 text-sm text-[oklch(0.5_0.23_27)] dark:text-[oklch(0.78_0.23_27)]">
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
          <h3 className="text-sm font-semibold">{rangeLabel} summary</h3>
          <p className="text-xs text-muted-foreground">
            {isAllTime
              ? "Showing all-time account totals"
              : `Showing ${cardLabelSuffix}`}
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Period</Label>
            <Select
              value={rangeKey}
              onValueChange={(v) => setRangeKey(v as RangeKey)}
            >
              <SelectTrigger className="h-9 w-[160px]">
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
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">From</Label>
                <Input
                  type="date"
                  className="h-9"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">To</Label>
                <Input
                  type="date"
                  className="h-9"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                />
              </div>
            </>
          )}
        </div>
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

        <div className="rounded-2xl border bg-card shadow-xs p-5">
          <h3 className="text-sm font-semibold mb-4">
            Distribution snapshot
          </h3>

          {distributionForRange.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No distribution data available.
            </p>
          ) : (
            <ul className="space-y-3">
              {distributionForRange.map((p) => (
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