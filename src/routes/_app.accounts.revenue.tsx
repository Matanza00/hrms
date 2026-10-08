import { createFileRoute } from "@tanstack/react-router";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ChartCard } from "@/components/shared/ChartCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
  component: RevenuePage,
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

  const totalRevenue = revenues.reduce(
    (sum, r) => sum + Number(r.amount || 0),
    0
  );

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
      <div className="rounded-2xl border bg-card shadow-xs p-6 text-sm text-muted-foreground">
        Loading revenue...
      </div>
    );
  }

  if (loadError) {
    return (
      <div role="alert" className="rounded-2xl border border-destructive/25 bg-destructive/10 p-6 text-sm text-[oklch(0.5_0.23_27)] dark:text-[oklch(0.78_0.23_27)]">
        {String(loadError.message)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartCard title="Revenue trend" description="Revenue by month">
            <ResponsiveContainer>
              <BarChart data={revenueTrend}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                  vertical={false}
                />

                <XAxis
                  dataKey="month"
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

                <Bar
                  dataKey="revenue"
                  fill="var(--color-chart-2)"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div className="rounded-2xl border bg-card shadow-xs p-5">
          <h3 className="text-sm font-semibold mb-3">Quick stats</h3>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total revenue</span>
              <span className="font-medium tabular-nums">
                {formatPKR(totalRevenue)}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">Entries</span>
              <span className="font-medium">{revenues.length}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">Latest entry</span>
              <span className="font-medium">
                {revenues[0]?.revenueDate
                  ? formatDate(revenues[0].revenueDate)
                  : "—"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Record revenue
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record revenue</DialogTitle>
            </DialogHeader>

            {error && (
              <div role="alert" className="rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-[oklch(0.5_0.23_27)] dark:text-[oklch(0.78_0.23_27)]">
                {error}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Date</Label>
                <Input
                  type="date"
                  value={form.revenueDate}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, revenueDate: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Client</Label>
                <Input
                  value={form.client}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, client: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Source</Label>
                <Input
                  value={form.source}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, source: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Amount (PKR)</Label>
                <Input
                  type="number"
                  value={form.amount}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, amount: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Description</Label>
                <Input
                  value={form.description}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, description: e.target.value }))
                  }
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
            render: (r) => (
              <span className="font-medium">{r.client || "—"}</span>
            ),
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
              <span className="font-semibold tabular-nums">
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