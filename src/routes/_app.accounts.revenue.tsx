import { createFileRoute } from "@tanstack/react-router";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ChartCard } from "@/components/shared/ChartCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { revenues, formatPKR, revenueExpenseTrend, type Revenue } from "@/lib/mock-data";
import { Plus } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const Route = createFileRoute("/_app/accounts/revenue")({
  component: () => (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartCard title="Revenue trend" description="Last 6 months">
            <ResponsiveContainer>
              <BarChart data={revenueExpenseTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="month" fontSize={11} stroke="var(--color-muted-foreground)" />
                <YAxis fontSize={11} stroke="var(--color-muted-foreground)" tickFormatter={(v) => `${(v/1000000).toFixed(1)}M`} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }} formatter={(v: number) => formatPKR(v)} />
                <Bar dataKey="revenue" fill="var(--color-chart-2)" radius={[8,8,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
        <div className="rounded-2xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-3">Quick stats</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Total this month</span><span className="font-medium tabular-nums">{formatPKR(4930000)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Last month</span><span className="font-medium tabular-nums">{formatPKR(4400000)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Pending invoices</span><span className="font-medium">3</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Top client</span><span className="font-medium">Stark Inc</span></div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Dialog>
          <DialogTrigger asChild><Button size="sm"><Plus className="mr-1.5 h-3.5 w-3.5" />Record revenue</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Record revenue</DialogTitle></DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label className="text-xs">Date</Label><Input type="date" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Client</Label><Input /></div>
              <div className="space-y-1.5"><Label className="text-xs">Source</Label><Input /></div>
              <div className="space-y-1.5"><Label className="text-xs">Amount (PKR)</Label><Input type="number" /></div>
            </div>
            <Button>Save</Button>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable<Revenue>
        rowKey={(r) => r.id}
        data={revenues}
        columns={[
          { key: "date", header: "Date" },
          { key: "client", header: "Client", render: (r) => <span className="font-medium">{r.client}</span> },
          { key: "source", header: "Source" },
          { key: "amount", header: "Amount", render: (r) => <span className="font-semibold tabular-nums">{formatPKR(r.amount)}</span> },
          { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
        ]}
      />
    </div>
  ),
});
