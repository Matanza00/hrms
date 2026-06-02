import { createFileRoute } from "@tanstack/react-router";
import { DataTable } from "@/components/shared/DataTable";
import { ChartCard } from "@/components/shared/ChartCard";
import { formatPKR, reserveTransactions, type ReserveTxn } from "@/lib/mock-data";
import { ArrowDownLeft, ArrowUpRight, PiggyBank } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/_app/accounts/reserve")({
  component: () => (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary to-[oklch(0.3_0.06_265)] p-6 text-primary-foreground">
          <PiggyBank className="absolute right-4 top-4 h-16 w-16 opacity-10" />
          <p className="text-xs uppercase tracking-wider opacity-80">Reserve balance</p>
          <p className="mt-2 text-3xl font-semibold">{formatPKR(4800000)}</p>
          <p className="mt-3 text-xs opacity-80">+{formatPKR(500000)} this month</p>
        </div>
        <div className="lg:col-span-2">
          <ChartCard title="Reserve trend" description="Last 4 months">
            <ResponsiveContainer>
              <AreaChart data={[...reserveTransactions].reverse().map((t) => ({ date: t.date.slice(0,7), balance: t.balance }))}>
                <defs><linearGradient id="resv" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.4} /><stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="date" fontSize={11} stroke="var(--color-muted-foreground)" />
                <YAxis fontSize={11} stroke="var(--color-muted-foreground)" tickFormatter={(v) => `${(v/1000000).toFixed(1)}M`} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }} formatter={(v: number) => formatPKR(v)} />
                <Area type="monotone" dataKey="balance" stroke="var(--color-chart-1)" fill="url(#resv)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>

      <DataTable<ReserveTxn>
        rowKey={(r) => r.id}
        data={reserveTransactions}
        columns={[
          { key: "date", header: "Date" },
          { key: "description", header: "Description", render: (r) => <span className="font-medium">{r.description}</span> },
          { key: "type", header: "Type", render: (r) => (
            <span className={`inline-flex items-center gap-1 text-xs ${r.type === "credit" ? "text-[oklch(0.55_0.18_152)]" : "text-[oklch(0.55_0.23_27)]"}`}>
              {r.type === "credit" ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}{r.type}
            </span>
          )},
          { key: "amount", header: "Amount", render: (r) => <span className={`tabular-nums font-medium ${r.type === "credit" ? "text-[oklch(0.55_0.18_152)]" : "text-[oklch(0.55_0.23_27)]"}`}>{r.type === "credit" ? "+" : "-"}{formatPKR(r.amount)}</span> },
          { key: "balance", header: "Balance", render: (r) => <span className="font-semibold tabular-nums">{formatPKR(r.balance)}</span> },
        ]}
      />
    </div>
  ),
});
