import { createFileRoute } from "@tanstack/react-router";

import { chartMotion } from "@/lib/chartMotion";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ChartCard } from "@/components/shared/ChartCard";
import { ComboBox } from "@/components/shared/ComboBox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChartColumn, CheckCircle2, Pencil, Plus, Trash2, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createRevenue,
  deleteRevenue,
  getRevenue,
  setRevenueStatus,
  updateRevenue,
  type Revenue,
} from "@/lib/api/accounts";
import { useMemo, useState } from "react";

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
  background: "var(--color-popover)",
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

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function toDateInput(value?: string) {
  if (!value) return todayStr();
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return todayStr();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function uniqueSorted(values: (string | undefined)[]) {
  return Array.from(new Set(values.map((v) => (v || "").trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b),
  );
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

const emptyForm = {
  revenueDate: todayStr(),
  client: "",
  source: "",
  category: "",
  amount: "",
  description: "",
};

function RevenuePage() {
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Revenue | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [error, setError] = useState("");

  const {
    data: revenues = [],
    isLoading,
    error: loadError,
  } = useQuery({
    queryKey: ["revenue"],
    queryFn: getRevenue,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["revenue"] });
    qc.invalidateQueries({ queryKey: ["accountsOverview"] });
  };

  const createMutation = useMutation({
    mutationFn: createRevenue,
    meta: { inlineErrors: true, success: "Revenue saved" },
    onSuccess: () => {
      invalidate();
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateRevenue,
    meta: { inlineErrors: true, success: "Revenue updated" },
    onSuccess: () => {
      invalidate();
      closeDialog();
    },
  });

  const statusMutation = useMutation({
    mutationFn: setRevenueStatus,
    meta: { success: "Revenue status updated" },
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRevenue,
    meta: { success: "Revenue deleted" },
    onSuccess: invalidate,
  });

  const saving = createMutation.isPending || updateMutation.isPending;

  const clientOptions = useMemo(() => uniqueSorted(revenues.map((r) => r.client)), [revenues]);

  // Sources previously used for the selected client (payments for the same
  // project often arrive as milestones under the same source). Falls back to
  // every source when no client is chosen yet.
  const sourceOptions = useMemo(() => {
    const client = form.client.trim().toLowerCase();
    const scoped = client
      ? revenues.filter((r) => (r.client || "").trim().toLowerCase() === client)
      : revenues;
    return uniqueSorted(scoped.map((r) => r.source));
  }, [revenues, form.client]);

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

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, revenueDate: todayStr() });
    setError("");
    setOpen(true);
  }

  function openEdit(r: Revenue) {
    setEditing(r);
    setForm({
      revenueDate: toDateInput(r.revenueDate),
      client: r.client || "",
      source: r.source || "",
      category: r.category || "",
      amount: String(r.amount ?? ""),
      description: r.description || "",
    });
    setError("");
    setOpen(true);
  }

  function closeDialog() {
    setOpen(false);
    setEditing(null);
    setForm({ ...emptyForm, revenueDate: todayStr() });
  }

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

      if (editing) {
        await updateMutation.mutateAsync({
          revenueId: editing.revenueId,
          revenueDate: form.revenueDate,
          amount: Number(form.amount),
          category: form.category,
          client: form.client,
          source: form.source,
          description: form.description,
        });
      } else {
        await createMutation.mutateAsync({
          revenueDate: form.revenueDate,
          amount: Number(form.amount),
          category: form.category,
          client: form.client,
          source: form.source,
          description: form.description,
        });
      }
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
      <div
        role="alert"
        className="rounded-lg border border-danger-line bg-danger-tint p-4 text-[13px] text-danger-ink"
      >
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
                  {...chartMotion()}
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
        <Button onClick={openCreate}>
          <Plus />
          Record revenue
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : closeDialog())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit revenue" : "Record revenue"}</DialogTitle>
          </DialogHeader>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-danger-line bg-danger-tint px-3 py-2 text-[13px] text-danger-ink"
            >
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
              <ComboBox
                value={form.client}
                onChange={(client) =>
                  // Clear the source when the client changes — sources are
                  // scoped to a client.
                  setForm((p) => ({
                    ...p,
                    client,
                    source: p.client === client ? p.source : "",
                  }))
                }
                options={clientOptions}
                placeholder="Select or add a client"
                addLabel="Add client"
                emptyText="No clients yet — type to add."
              />
            </div>

            <div className="space-y-1.5">
              <Label>Source</Label>
              <ComboBox
                value={form.source}
                onChange={(source) => setForm((p) => ({ ...p, source }))}
                options={sourceOptions}
                placeholder="Select or add a source"
                addLabel="Add source"
                emptyText={
                  form.client
                    ? "No sources yet for this client — type to add."
                    : "No sources yet — type to add."
                }
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

          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : editing ? "Save changes" : "Save"}
          </Button>
        </DialogContent>
      </Dialog>

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
            render: (r) => {
              const status = r.status || "Pending";
              const received = status.toLowerCase() === "received";
              return (
                <div className="flex items-center gap-2">
                  <StatusBadge status={status} />
                  {!received && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={statusMutation.isPending}
                      onClick={() =>
                        statusMutation.mutate({
                          revenueId: r.revenueId,
                          status: "Received",
                        })
                      }
                    >
                      <CheckCircle2 className="text-success-ink" />
                      Mark received
                    </Button>
                  )}
                </div>
              );
            },
          },
          {
            key: "actions",
            header: "",
            className: "text-right",
            render: (r) => (
              <div className="flex justify-end gap-1.5">
                <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                  <Pencil />
                  Edit
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline" className="text-danger-ink">
                      <Trash2 />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete revenue entry?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This permanently removes the {formatPKR(r.amount)} entry
                        {r.client ? ` from ${r.client}` : ""}. This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteMutation.mutate(r.revenueId)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
