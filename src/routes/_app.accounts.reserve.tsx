import { createFileRoute } from "@tanstack/react-router";
import { DataTable } from "@/components/shared/DataTable";
import { ChartCard } from "@/components/shared/ChartCard";
import { ArrowDownLeft, ArrowUpRight, PiggyBank } from "lucide-react";
import { cn } from "@/lib/utils";
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
import { getReserveLedger, type ReserveTransaction } from "@/lib/api/accounts";

export const Route = createFileRoute("/_app/accounts/reserve")({
  head: () => ({ meta: [{ title: "Reserve — LDS HRMS" }] }),
  component: ReservePage,
});

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

function formatPKR(value: number | string | undefined) {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value?: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getTxnType(type?: string) {
  return String(type || "").toLowerCase() === "credit" ? "credit" : "debit";
}

function ReservePage() {
  const {
    data: reserveTransactions = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["reserveLedger"],
    queryFn: getReserveLedger,
  });

  if (isLoading) {
    return (
      <div className="rounded-2xl border bg-card p-6 text-[13px] text-muted-foreground">
        Loading reserve ledger...
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

  const sorted = [...reserveTransactions].sort(
    (a, b) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime(),
  );

  const latest = sorted[sorted.length - 1];

  const reserveBalance = Number(latest?.balanceAfter || 0);

  const currentMonthKey = localMonthKey(); // local time, not UTC: avoids the previous month early on the 1st

  const addedThisMonth = reserveTransactions
    .filter(
      (t) =>
        String(t.transactionDate).slice(0, 7) === currentMonthKey &&
        getTxnType(t.transactionType) === "credit",
    )
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const trend = sorted.map((t) => ({
    date: formatDate(t.transactionDate),
    balance: Number(t.balanceAfter || 0),
  }));

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Flat dark balance card (Figma): no gradient, no shadow. */}
        <div className="relative flex min-h-40 flex-col overflow-hidden rounded-2xl bg-primary p-6 text-primary-foreground lg:min-h-[220px] lg:self-start">
          <PiggyBank className="absolute right-6 top-6 size-10 opacity-30" />
          <p className="font-mono text-xs opacity-60">Reserve balance</p>
          <p className="mt-1.5 truncate font-mono text-[26px] font-medium leading-8 tracking-[-0.8px] tabular-nums">
            {formatPKR(reserveBalance)}
          </p>
          <p className="mt-2 text-xs opacity-60">+{formatPKR(addedThisMonth)} this month</p>
        </div>

        <div className="min-w-0">
          <ChartCard
            icon={PiggyBank}
            tone="violet"
            title="Reserve trend"
            description="Running reserve balance"
          >
            <ResponsiveContainer>
              <AreaChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
                <CartesianGrid
                  strokeDasharray="4 4"
                  stroke="var(--color-divider)"
                  vertical={false}
                />

                <XAxis
                  dataKey="date"
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

                <Area
                  type="monotone"
                  dataKey="balance"
                  name="Balance"
                  stroke="var(--color-violet)"
                  fill="var(--color-violet)"
                  fillOpacity={0.12}
                  strokeWidth={2}
                  dot={{ r: 3, fill: "var(--color-card)", strokeWidth: 1.5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>

      <DataTable<ReserveTransaction>
        rowKey={(r) => r.reserveId}
        data={[...reserveTransactions].reverse()}
        empty={
          <span className="inline-flex flex-col items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-md bg-muted">
              <PiggyBank className="size-4 text-muted-foreground" />
            </span>
            No reserve transactions yet
          </span>
        }
        columns={[
          {
            key: "transactionDate",
            header: "Date",
            render: (r) => formatDate(r.transactionDate),
          },
          {
            key: "description",
            header: "Description",
            render: (r) => <span className="font-medium">{r.description || "—"}</span>,
          },
          {
            key: "transactionType",
            header: "Type",
            render: (r) => {
              const type = getTxnType(r.transactionType);

              return (
                <span
                  className={cn(
                    "inline-flex h-[22px] items-center gap-1 rounded-sm border px-2 text-xs font-medium capitalize",
                    type === "credit"
                      ? "border-success-line bg-success-tint text-success-ink"
                      : "border-danger-line bg-danger-tint text-danger-ink",
                  )}
                >
                  {type === "credit" ? (
                    <ArrowDownLeft className="size-3" />
                  ) : (
                    <ArrowUpRight className="size-3" />
                  )}
                  {type}
                </span>
              );
            },
          },
          {
            key: "amount",
            header: "Amount",
            render: (r) => {
              const type = getTxnType(r.transactionType);

              return (
                <span
                  className={cn(
                    "font-mono text-[13px] font-medium tabular-nums",
                    type === "credit" ? "text-success-ink" : "text-danger-ink",
                  )}
                >
                  {type === "credit" ? "+" : "-"}
                  {formatPKR(r.amount)}
                </span>
              );
            },
          },
          {
            key: "balanceAfter",
            header: "Balance",
            render: (r) => (
              <span className="font-mono text-[13px] font-medium tabular-nums">
                {formatPKR(r.balanceAfter)}
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}

/** "YYYY-MM" for the current month in the viewer's local time zone. */
function localMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
