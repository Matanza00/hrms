import { createFileRoute } from "@tanstack/react-router";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ChartCard } from "@/components/shared/ChartCard";
import { ComboBox } from "@/components/shared/ComboBox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, CheckCircle2 } from "lucide-react";
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
} from "@/components/ui/dialog";
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
  return Array.from(
    new Set(values.map((v) => (v || "").trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));
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
    onSuccess: () => {
      invalidate();
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateRevenue,
    onSuccess: () => {
      invalidate();
      closeDialog();
    },
  });

  const statusMutation = useMutation({
    mutationFn: setRevenueStatus,
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRevenue,
    onSuccess: invalidate,
  });

  const saving = createMutation.isPending || updateMutation.isPending;

  const clientOptions = useMemo(
    () => uniqueSorted(revenues.map((r) => r.client)),
    [revenues],
  );

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

  const totalRevenue = revenues.reduce(
    (sum, r) => sum + Number(r.amount || 0),
    0,
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
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Record revenue
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : closeDialog())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit revenue" : "Record revenue"}</DialogTitle>
          </DialogHeader>

<<<<<<< HEAD
            {error && (
              <div role="alert" className="rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-[oklch(0.5_0.23_27)] dark:text-[oklch(0.78_0.23_27)]">
                {error}
              </div>
            )}
=======
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
>>>>>>> 9c3a7fc1abebff29637c9d5d466c84a2088a9e79

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
              <Label className="text-xs">Source</Label>
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
                      className="h-7"
                      disabled={statusMutation.isPending}
                      onClick={() =>
                        statusMutation.mutate({
                          revenueId: r.revenueId,
                          status: "Received",
                        })
                      }
                    >
                      <CheckCircle2 className="mr-1 h-3 w-3" />
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
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7"
                  onClick={() => openEdit(r)}
                >
                  <Pencil className="mr-1 h-3 w-3" />
                  Edit
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline" className="h-7 text-red-600">
                      <Trash2 className="mr-1 h-3 w-3" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete revenue entry?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This permanently removes the {formatPKR(r.amount)} entry
                        {r.client ? ` from ${r.client}` : ""}. This cannot be
                        undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteMutation.mutate(r.revenueId)}
                      >
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
