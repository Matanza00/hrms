import { createFileRoute } from "@tanstack/react-router";
import { DataTable } from "@/components/shared/DataTable";
import { ChartCard } from "@/components/shared/ChartCard";
import { RecurringExpensesManager } from "@/components/accounts/RecurringExpensesManager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Plus, Pencil, Trash2, Repeat } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createExpense,
  deleteExpense,
  getExpenses,
  updateExpense,
  type Expense,
} from "@/lib/api/accounts";
import { useState } from "react";

const categories = [
  "Salary",
  "Utilities",
  "Tools",
  "Emergency",
  "Misc",
  "Reserve",
];

const colors = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "var(--color-muted-foreground)",
];

export const Route = createFileRoute("/_app/accounts/expenses")({
  component: ExpensesPage,
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

const emptyForm = {
  expenseDate: todayStr(),
  category: "",
  description: "",
  amount: "",
};

function ExpensesPage() {
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [error, setError] = useState("");

  const {
    data: expenses = [],
    isLoading,
    error: loadError,
  } = useQuery({
    queryKey: ["expenses"],
    queryFn: getExpenses,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["expenses"] });
    qc.invalidateQueries({ queryKey: ["reserveLedger"] });
    qc.invalidateQueries({ queryKey: ["accountsOverview"] });
  };

  const createMutation = useMutation({
    mutationFn: createExpense,
    onSuccess: () => {
      invalidate();
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateExpense,
    onSuccess: () => {
      invalidate();
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteExpense,
    onSuccess: invalidate,
  });

  const saving = createMutation.isPending || updateMutation.isPending;

  const byCat = categories.map((c, i) => ({
    name: c,
    value: expenses
      .filter((e) => e.category === c)
      .reduce((a, b) => a + Number(b.amount || 0), 0),
    color: colors[i],
  }));

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, expenseDate: todayStr() });
    setError("");
    setOpen(true);
  }

  function openEdit(e: Expense) {
    setEditing(e);
    setForm({
      expenseDate: toDateInput(e.expenseDate),
      category: e.category || "",
      description: e.description || "",
      amount: String(e.amount ?? ""),
    });
    setError("");
    setOpen(true);
  }

  function closeDialog() {
    setOpen(false);
    setEditing(null);
    setForm({ ...emptyForm, expenseDate: todayStr() });
  }

  async function handleSave() {
    try {
      setError("");

      if (!form.expenseDate) {
        setError("Date is required.");
        return;
      }

      if (!form.category) {
        setError("Category is required.");
        return;
      }

      if (!form.amount || Number(form.amount) <= 0) {
        setError("Amount must be greater than zero.");
        return;
      }

      if (editing) {
        await updateMutation.mutateAsync({
          expenseId: editing.expenseId,
          expenseDate: form.expenseDate,
          category: form.category,
          description: form.description,
          amount: Number(form.amount),
        });
      } else {
        await createMutation.mutateAsync({
          expenseDate: form.expenseDate,
          category: form.category,
          description: form.description,
          amount: Number(form.amount),
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save expense.");
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl border bg-card shadow-xs p-6 text-sm text-muted-foreground">
        Loading expenses...
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
          <ChartCard title="Expense breakdown" description="By category">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={byCat}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={90}
                  innerRadius={50}
                  paddingAngle={3}
                >
                  {byCat.map((s, i) => (
                    <Cell key={i} fill={s.color} />
                  ))}
                </Pie>

                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => formatPKR(v)}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div className="rounded-2xl border bg-card shadow-xs p-5">
          <h3 className="text-sm font-semibold mb-3">By category</h3>

          <ul className="space-y-2.5 text-sm">
            {byCat.map((c) => (
              <li key={c.name} className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: c.color }}
                  />
                  {c.name}
                </span>

                <span className="font-medium tabular-nums">
                  {formatPKR(c.value)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <RecurringExpensesManager />

      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Record expense
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : closeDialog())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit expense" : "Record expense"}</DialogTitle>
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
                value={form.expenseDate}
                onChange={(e) =>
                  setForm((p) => ({ ...p, expenseDate: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Category</Label>
              <Select
                value={form.category}
                onValueChange={(value) =>
                  setForm((p) => ({ ...p, category: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>

                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount spans the full width of the dialog. */}
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs">Amount (PKR)</Label>
              <Input
                type="number"
                value={form.amount}
                onChange={(e) =>
                  setForm((p) => ({ ...p, amount: e.target.value }))
                }
              />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
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

      <DataTable<Expense>
        rowKey={(r) => r.expenseId}
        data={expenses}
        columns={[
          {
            key: "expenseDate",
            header: "Date",
            render: (r) => formatDate(r.expenseDate),
          },
          {
            key: "category",
            header: "Category",
            render: (r) => (
              <span className="inline-flex items-center gap-1.5">
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">
                  {r.category || "—"}
                </span>
                {r.recurringId && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent"
                    title="Auto-posted from a recurring template"
                  >
                    <Repeat className="h-2.5 w-2.5" />
                    Recurring
                  </span>
                )}
              </span>
            ),
          },
          {
            key: "description",
            header: "Description",
            render: (r) => (
              <span className="font-medium">{r.description || "—"}</span>
            ),
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
                      <AlertDialogTitle>Delete expense?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This permanently removes the {formatPKR(r.amount)}{" "}
                        {r.category} expense. This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteMutation.mutate(r.expenseId)}
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
