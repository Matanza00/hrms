import { createFileRoute } from "@tanstack/react-router";
import { profitDistribution, formatPKR } from "@/lib/mock-data";
import { ChartCard } from "@/components/shared/ChartCard";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from "recharts";

export const Route = createFileRoute("/_app/accounts/profit-distribution")({
  component: () => (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {profitDistribution.map((p) => (
          <div key={p.name} className="relative overflow-hidden rounded-2xl border bg-card p-5">
            <div className="absolute inset-x-0 top-0 h-1" style={{ background: p.color }} />
            <p className="text-xs text-muted-foreground">{p.name}</p>
            <p className="mt-2 text-2xl font-semibold">{formatPKR(p.amount)}</p>
            <div className="mt-3 flex items-end justify-between">
              <span className="text-xs text-muted-foreground">share</span>
              <span className="text-sm font-medium" style={{ color: p.color }}>{p.percent}%</span>
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${p.percent}%`, background: p.color }} />
            </div>
          </div>
        ))}
      </div>

      <ChartCard title="Distribution overview" description={`Net profit · ${formatPKR(profitDistribution.reduce((a,b) => a+b.amount, 0))}`}>
        <ResponsiveContainer>
          <PieChart>
            <Pie data={profitDistribution} dataKey="amount" nameKey="name" outerRadius={100} innerRadius={60} paddingAngle={3}>
              {profitDistribution.map((s, i) => <Cell key={i} fill={s.color} />)}
            </Pie>
            <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }} formatter={(v: number) => formatPKR(v)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  ),
});
