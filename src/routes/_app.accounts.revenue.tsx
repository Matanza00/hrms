import { createFileRoute } from "@tanstack/react-router";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ChartCard } from "@/components/shared/ChartCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChartColumn, Plus, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createRevenue, getRevenue, type Revenue } from "@/lib/api/accounts";
import { useState } from "react";

export const Route = createFileRoute("/_app/accounts/revenue")({
  head: () => ({ meta: [{ title: "Revenue — LDS HRMS" }] }),
  component: RevenuePage,
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

function getMonthKey(value?: string) {
  if (!value) return "Unknown";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value).slice(0, 7);

  return date.toLocaleDateString("en-PK", {
    month: "short",
    year: "2-digit",
  });
}

function RevenuePage() {
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    revenueDate: "",
    client: "",
    source: "",
    category: "",
    amount: "",
    description: "",
  });
  const [error, setError] = useState("");

  const {
    data: revenues = [],
    isLoading,
    error: loadError,
  } = useQuery({
    queryKey: ["revenue"],
    queryFn: getRevenue,
  });

  const createMutation = useMutation({
    mutationFn: createRevenue,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["revenue"] });
      qc.invalidateQueries({ queryKey: ["accountsOverview"] });
      setOpen(false);
      setForm({
        revenueDate: "",
        client: "",
        source: "",
        category: "",
        amount: "",
        description: "",
      });
    },
  });

  const totalRevenue = revenues.reduce((sum, r) => sum + Number(r.amount || 0), 0);

  const monthlyMap = revenues.reduce<Record<string, number>>((acc, r) => {
    const key = getMonthKey(r.revenueDate);
    acc[key] = (acc[key] || 0) + Number(r.amount || 0);
    return acc;
  }, {});

  const revenueTrend = Object.entries(monthlyMap).map(([month, revenue]) => ({
    month,
    revenue,
  }));

  async function handleSave() {
    try {
      setError("");

      if (!form.revenueDate) {
        setError("Date is required.");
        return;
      }

      if (!form.amount || Number(form.amount) <= 0) {
        setError("Amount must be greater than zero.");
        return;
      }

      await createMutation.mutateAsync({
        revenueDate: form.revenueDate,
        amount: Number(form.amount),
        category: form.category,
        client: form.client,
        source: form.source,
        description: form.description,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save revenue.");
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl border bg-card p-6 text-[13px] text-muted-foreground">
        Loading revenue...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-lg border border-danger-line bg-danger-tint p-4 text-[13px] text-danger-ink">
        {String(loadError.message)}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <ChartCard
            icon={TrendingUp}
            tone="success"
            title="Revenue trend"
            description="Revenue by month"
          >
            <ResponsiveContainer>
              <BarChart data={revenueTrend} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
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
                  cursor={{ fill: "var(--color-muted)" }}
                  formatter={(v: number) => formatPKR(v)}
                />

                <Bar
                  dataKey="revenue"
                  name="Revenue"
                  fill="var(--color-success)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={80}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <ChartCard icon={ChartColumn} tone="info" title="Quick stats" bodyClassName="">
          <dl className="-my-3 divide-y divide-divider text-[13px]">
            <div className="flex items-center justify-between gap-3 py-3">
              <dt className="text-muted-foreground">Total revenue</dt>
              <dd className="font-mono font-medium tabular-nums">{formatPKR(totalRevenue)}</dd>
            </div>

            <div className="flex items-center justify-between gap-3 py-3">
              <dt className="text-muted-foreground">Entries</dt>
              <dd className="font-mono font-medium tabular-nums">{revenues.length}</dd>
            </div>

            <div className="flex items-center justify-between gap-3 py-3">
              <dt className="text-muted-foreground">Latest entry</dt>
              <dd className="font-mono font-medium tabular-nums">
                {revenues[0]?.revenueDate ? formatDate(revenues[0].revenueDate) : "—"}
              </dd>
            </div>
          </dl>
        </ChartCard>
      </div>

      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus />
              Record revenue
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record revenue</DialogTitle>
            </DialogHeader>

            {error && (
              <div className="rounded-lg border border-danger-line bg-danger-tint px-3 py-2 text-[13px] text-danger-ink">
                {error}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={form.revenueDate}
                  onChange={(e) => setForm((p) => ({ ...p, revenueDate: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Client</Label>
                <Input
                  value={form.client}
                  onChange={(e) => setForm((p) => ({ ...p, client: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Source</Label>
                <Input
                  value={form.source}
                  onChange={(e) => setForm((p) => ({ ...p, source: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Amount (PKR)</Label>
                <Input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label>Description</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                />
              </div>
            </div>

            <Button onClick={handleSave} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable<Revenue>
        rowKey={(r) => r.revenueId}
        data={revenues}
        columns={[
          {
            key: "revenueDate",
            header: "Date",
            render: (r) => formatDate(r.revenueDate),
          },
          {
            key: "client",
            header: "Client",
            render: (r) => <span className="font-medium">{r.client || "—"}</span>,
          },
          {
            key: "source",
            header: "Source",
            render: (r) => r.source || r.category || "—",
          },
          {
            key: "amount",
            header: "Amount",
            render: (r) => (
              <span className="font-mono text-[13px] font-medium tabular-nums">
                {formatPKR(r.amount)}
              </span>
            ),
          },
          {
            key: "status",
            header: "Status",
            render: (r) => <StatusBadge status={r.status || "Recorded"} />,
          },
        ]}
      />
    </div>
  );
}
