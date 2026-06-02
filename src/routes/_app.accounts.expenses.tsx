import { createFileRoute } from "@tanstack/react-router";
import { DataTable } from "@/components/shared/DataTable";
import { ChartCard } from "@/components/shared/ChartCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { expenses, formatPKR, type Expense } from "@/lib/mock-data";
import { Plus } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const categories = ["Salary", "Utilities", "Tools", "Emergency", "Misc", "Reserve"];
const colors = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)", "var(--color-chart-5)", "var(--color-muted-foreground)"];

export const Route = createFileRoute("/_app/accounts/expenses")({
  component: () => {
    const byCat = categories.map((c, i) => ({
      name: c, value: expenses.filter((e) => e.category === c).reduce((a, b) => a + b.amount, 0), color: colors[i],
    }));
    return (
      <div className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ChartCard title="Expense breakdown" description="By category">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={byCat} dataKey="value" nameKey="name" outerRadius={90} innerRadius={50} paddingAngle={3}>{byCat.map((s, i) => <Cell key={i} fill={s.color} />)}</Pie>
                  <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }} formatter={(v: number) => formatPKR(v)} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
          <div className="rounded-2xl border bg-card p-5">
            <h3 className="text-sm font-semibold mb-3">By category</h3>
            <ul className="space-y-2.5 text-sm">
              {byCat.map((c) => (
                <li key={c.name} className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: c.color }} />{c.name}</span>
                  <span className="font-medium tabular-nums">{formatPKR(c.value)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex justify-end">
          <Dialog>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-1.5 h-3.5 w-3.5" />Record expense</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Record expense</DialogTitle></DialogHeader>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5"><Label className="text-xs">Date</Label><Input type="date" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Category</Label>
                  <Select><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2 space-y-1.5"><Label className="text-xs">Description</Label><Input /></div>
                <div className="space-y-1.5"><Label className="text-xs">Amount</Label><Input type="number" /></div>
              </div>
              <Button>Save</Button>
            </DialogContent>
          </Dialog>
        </div>

        <DataTable<Expense>
          rowKey={(r) => r.id}
          data={expenses}
          columns={[
            { key: "date", header: "Date" },
            { key: "category", header: "Category", render: (r) => <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">{r.category}</span> },
            { key: "description", header: "Description", render: (r) => <span className="font-medium">{r.description}</span> },
            { key: "amount", header: "Amount", render: (r) => <span className="font-semibold tabular-nums">{formatPKR(r.amount)}</span> },
          ]}
        />
      </div>
    );
  },
});
