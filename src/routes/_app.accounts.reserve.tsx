import { createFileRoute } from "@tanstack/react-router";
import { DataTable } from "@/components/shared/DataTable";
import { ChartCard } from "@/components/shared/ChartCard";
import { ArrowDownLeft, ArrowUpRight, PiggyBank } from "lucide-react";
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
  getReserveLedger,
  type ReserveTransaction,
} from "@/lib/api/accounts";

export const Route = createFileRoute("/_app/accounts/reserve")({
  component: ReservePage,
});

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
      <div className="rounded-2xl border bg-card shadow-xs p-6 text-sm text-muted-foreground">
        Loading reserve ledger...
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

  const sorted = [...reserveTransactions].sort(
    (a, b) =>
      new Date(a.transactionDate).getTime() -
      new Date(b.transactionDate).getTime()
  );

  const latest = sorted[sorted.length - 1];

  const reserveBalance = Number(
    latest?.balanceAfter || 0
  );

  const currentMonthKey = new Date().toISOString().slice(0, 7);

  const addedThisMonth = reserveTransactions
    .filter(
      (t) =>
        String(t.transactionDate).slice(0, 7) === currentMonthKey &&
        getTxnType(t.transactionType) === "credit"
    )
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const trend = sorted.map((t) => ({
    date: formatDate(t.transactionDate),
    balance: Number(t.balanceAfter || 0),
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary to-[oklch(0.3_0.06_265)] p-6 text-primary-foreground">
          <PiggyBank className="absolute right-4 top-4 h-16 w-16 opacity-10" />
          <p className="text-xs uppercase tracking-wider opacity-80">
            Reserve balance
          </p>
          <p className="mt-2 text-3xl font-semibold">
            {formatPKR(reserveBalance)}
          </p>
          <p className="mt-3 text-xs opacity-80">
            +{formatPKR(addedThisMonth)} this month
          </p>
        </div>

        <div className="lg:col-span-2">
          <ChartCard title="Reserve trend" description="Running reserve balance">
            <ResponsiveContainer>
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="resv" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="var(--color-chart-1)"
                      stopOpacity={0.4}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--color-chart-1)"
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
                  dataKey="date"
                  fontSize={11}
                  stroke="var(--color-muted-foreground)"
                />

                <YAxis
                  fontSize={11}
                  stroke="var(--color-muted-foreground)"
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
                  dataKey="balance"
                  stroke="var(--color-chart-1)"
                  fill="url(#resv)"
                  strokeWidth={2.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>

      <DataTable<ReserveTransaction>
        rowKey={(r) => r.reserveId}
        data={[...reserveTransactions].reverse()}
        columns={[
          {
            key: "transactionDate",
            header: "Date",
            render: (r) => formatDate(r.transactionDate),
          },
          {
            key: "description",
            header: "Description",
            render: (r) => (
              <span className="font-medium">
                {r.description || "—"}
              </span>
            ),
          },
          {
            key: "transactionType",
            header: "Type",
            render: (r) => {
              const type = getTxnType(r.transactionType);

              return (
                <span
                  className={`inline-flex items-center gap-1 text-xs ${
                    type === "credit"
                      ? "text-[oklch(0.48_0.18_152)]"
                      : "text-[oklch(0.5_0.23_27)]"
                  }`}
                >
                  {type === "credit" ? (
                    <ArrowDownLeft className="h-3 w-3" />
                  ) : (
                    <ArrowUpRight className="h-3 w-3" />
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
                  className={`tabular-nums font-medium ${
                    type === "credit"
                      ? "text-[oklch(0.48_0.18_152)]"
                      : "text-[oklch(0.5_0.23_27)]"
                  }`}
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
              <span className="font-semibold tabular-nums">
                {formatPKR(r.balanceAfter)}
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}