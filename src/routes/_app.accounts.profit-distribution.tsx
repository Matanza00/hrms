import { createFileRoute } from "@tanstack/react-router";
import { ChartCard } from "@/components/shared/ChartCard";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import {
  getAccountsOverview,
  type ProfitDistributionItem,
} from "@/lib/api/accounts";

export const Route = createFileRoute("/_app/accounts/profit-distribution")({
  component: ProfitDistributionPage,
});

const colors = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

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
      <div className="rounded-2xl border bg-card shadow-xs p-6 text-sm text-muted-foreground">
        Loading profit distribution...
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

  const distribution: ProfitDistributionItem[] = Array.isArray(
    data?.distribution
  )
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
      <div className="rounded-2xl border bg-card shadow-xs p-6 text-sm text-muted-foreground">
        No profit distribution available yet. Add revenue and expenses first.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {activeDistribution.map((p) => (
          <div
            key={p.name}
            className="relative overflow-hidden rounded-2xl border bg-card shadow-xs p-5"
          >
            <div
              className="absolute inset-x-0 top-0 h-1"
              style={{ background: p.color }}
            />

            <p className="text-xs text-muted-foreground">{p.name}</p>

            <p className="mt-2 text-2xl font-semibold">
              {formatPKR(p.amount)}
            </p>

            <div className="mt-3 flex items-end justify-between">
              <span className="text-xs text-muted-foreground">share</span>
              <span className="text-sm font-medium" style={{ color: p.color }}>
                {p.percent}%
              </span>
            </div>

            <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${p.percent}%`,
                  background: p.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <ChartCard
        title="Distribution overview"
        description={`Net profit · ${formatPKR(netProfit)}`}
      >
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={activeDistribution}
              dataKey="amount"
              nameKey="name"
              outerRadius={100}
              innerRadius={60}
              paddingAngle={3}
            >
              {activeDistribution.map((s, i) => (
                <Cell key={i} fill={s.color} />
              ))}
            </Pie>

            <Tooltip
              contentStyle={{
                background: "var(--color-card)",
                border: "1px solid var(--color-border)",
                borderRadius: 12,
                fontSize: 12,
              }}
              formatter={(v: number) => formatPKR(v)}
            />

            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}