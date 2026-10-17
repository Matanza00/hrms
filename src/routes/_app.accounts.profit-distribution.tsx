import { createFileRoute } from "@tanstack/react-router";
import { ChartCard } from "@/components/shared/ChartCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { ChartPie } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { getAccountsOverview, type ProfitDistributionItem } from "@/lib/api/accounts";

export const Route = createFileRoute("/_app/accounts/profit-distribution")({
  head: () => ({ meta: [{ title: "Profit Distribution — LDS HRMS" }] }),
  component: ProfitDistributionPage,
});

const colors = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

const tooltipStyle = {
  background: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  fontSize: 12,
  boxShadow: "var(--shadow-xs)",
};

/** 500000 -> "500K", 1250000 -> "1.3M" for the donut centre. */
function formatCompact(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatPKR(value: number | string | undefined) {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function ProfitDistributionPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["accountsOverview"],
    queryFn: getAccountsOverview,
  });

  if (isLoading) {
    return (
      <div className="rounded-2xl border bg-card p-6 text-[13px] text-muted-foreground">
        Loading profit distribution...
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-danger-line bg-danger-tint p-4 text-[13px] text-danger-ink"
      >
        {error instanceof Error ? error.message : "Something went wrong"}
      </div>
    );
  }

  const distribution: ProfitDistributionItem[] = Array.isArray(data?.distribution)
    ? data.distribution
    : [];

  const activeDistribution = distribution
    .map((item, index) => ({
      ...item,
      amount: Number(item.amount || 0),
      percent: Number(item.percent || 0),
      color: colors[index % colors.length],
    }))
    .filter((item) => item.amount > 0 || item.percent > 0);

  const netProfit =
    data?.summary?.netProfit ??
    activeDistribution.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  if (activeDistribution.length === 0) {
    return (
      <EmptyState
        icon={ChartPie}
        title="No profit distribution available yet."
        description="Add revenue and expenses first."
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {activeDistribution.map((p) => (
          <div
            key={p.name}
            className="relative min-w-0 overflow-hidden rounded-2xl border bg-card px-5 pb-5 pt-6"
          >
            <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: p.color }} />

            <p className="truncate text-[13px] font-medium leading-[18px] text-muted-foreground">
              {p.name}
            </p>

            <p className="mt-1.5 truncate font-mono text-[22px] font-medium leading-8 tracking-[-0.8px] tabular-nums sm:text-[26px]">
              {formatPKR(p.amount)}
            </p>

            <div className="mt-2 flex items-end justify-between">
              <span className="text-xs text-muted-foreground">share</span>
              <span
                className="font-mono text-xs font-medium tabular-nums"
                style={{ color: p.color }}
              >
                {p.percent}%
              </span>
            </div>

            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-divider">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, Math.max(0, p.percent))}%`,
                  background: p.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <ChartCard
        icon={ChartPie}
        tone="info"
        title="Distribution overview"
        description={`Net profit · ${formatPKR(netProfit)}`}
        bodyClassName=""
      >
        <div className="relative h-64">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={activeDistribution}
                dataKey="amount"
                nameKey="name"
                outerRadius={96}
                innerRadius={66}
                paddingAngle={1}
                stroke="var(--color-card)"
                strokeWidth={2}
              >
                {activeDistribution.map((s, i) => (
                  <Cell key={i} fill={s.color} />
                ))}
              </Pie>

              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatPKR(v)} />
            </PieChart>
          </ResponsiveContainer>

          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="text-center">
              <p className="font-mono text-xl font-medium tabular-nums">
                {formatCompact(Number(netProfit) || 0)}
              </p>
              <p className="text-[11px] text-muted-foreground">Net profit</p>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
          {activeDistribution.map((p) => (
            <span key={p.name} className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-[2px]" style={{ background: p.color }} />
              {p.name}
            </span>
          ))}
        </div>
      </ChartCard>
    </div>
  );
}
