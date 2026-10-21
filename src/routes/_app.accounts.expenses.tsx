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
import { ChartPie, Pencil, Plus, Receipt, Repeat, Trash2, Wallet } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
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
  createExpense,
  deleteExpense,
  getExpenses,
  updateExpense,
  type Expense,
} from "@/lib/api/accounts";
import { useState } from "react";

const categories = ["Salary", "Utilities", "Tools", "Emergency", "Misc", "Reserve"];
// Salaries are posted automatically when payroll is marked paid, so they aren't
// offered for manual entry (it would count them twice).
const manualCategories = categories.filter((c) => c !== "Salary");

const colors = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "var(--color-muted-foreground)",
];

export const Route = createFileRoute("/_app/accounts/expenses")({
  head: () => ({ meta: [{ title: "Expenses — LDS HRMS" }] }),
  component: ExpensesPage,
});

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
    value: expenses.filter((e) => e.category === c).reduce((a, b) => a + Number(b.amount || 0), 0),
    color: colors[i],
  }));

  const hasExpenses = byCat.some((c) => c.value > 0);

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
      <div className="rounded-2xl border bg-card p-6 text-[13px] text-muted-foreground">
        Loading expenses...
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
            icon={ChartPie}
            tone="danger"
            title="Expense breakdown"
            description="By category"
          >
            {!hasExpenses ? (
              <div className="h-full [&>div]:h-full">
                <EmptyState icon={ChartPie} title="No expenses recorded yet" />
              </div>
            ) : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={byCat}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={90}
                    innerRadius={50}
                    paddingAngle={2}
                    stroke="var(--color-card)"
                  >
                    {byCat.map((s, i) => (
                      <Cell key={i} fill={s.color} />
                    ))}
                  </Pie>

                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatPKR(v)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        <ChartCard icon={Receipt} tone="info" title="By category" bodyClassName="">
          <ul className="-my-2.5 divide-y divide-divider text-[13px]">
            {byCat.map((c) => (
              <li key={c.name} className="flex items-center justify-between gap-3 py-2.5">
                <span className="flex items-center gap-2 text-text-secondary">
                  <span className="size-2 rounded-full" style={{ background: c.color }} />
                  {c.name}
                </span>

                <span className="font-mono font-medium tabular-nums">{formatPKR(c.value)}</span>
              </li>
            ))}
          </ul>
        </ChartCard>
      </div>

      <RecurringExpensesManager />

      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus />
          Record expense
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : closeDialog())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit expense" : "Record expense"}</DialogTitle>
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
                value={form.expenseDate}
                onChange={(e) => setForm((p) => ({ ...p, expenseDate: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(value) => setForm((p) => ({ ...p, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>

                <SelectContent>
                  {(manualCategories.includes(form.category) || !form.category
                    ? manualCategories
                    : [...manualCategories, form.category]
                  ).map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount spans the full width of the dialog. */}
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Amount (PKR)</Label>
              <Input
                type="number"
                value={form.amount}
                onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
              />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
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

      <DataTable<Expense>
        empty={
          <span className="inline-flex flex-col items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-md bg-muted">
              <Receipt className="size-4 text-muted-foreground" />
            </span>
            No expenses recorded yet
          </span>
        }
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
                <span className="inline-flex h-[22px] items-center rounded-sm border bg-subtle px-2 text-xs font-medium text-text-secondary">
                  {r.category || "—"}
                </span>
                {r.recurringId && (
                  <span
                    className="inline-flex h-[22px] items-center gap-1 rounded-sm border border-info-line bg-info-tint px-2 text-xs font-medium text-info-ink"
                    title="Auto-posted from a recurring template"
                  >
                    <Repeat className="size-3" />
                    Recurring
                  </span>
                )}
                {r.payrollId && (
                  <span
                    className="inline-flex h-[22px] items-center gap-1 rounded-sm border border-info-line bg-info-tint px-2 text-xs font-medium text-info-ink"
                    title="Posted automatically when this payroll was marked paid"
                  >
                    <Wallet className="size-3" />
                    Payroll
                  </span>
                )}
              </span>
            ),
          },
          {
            key: "description",
            header: "Description",
            render: (r) => <span className="font-medium">{r.description || "—"}</span>,
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
            key: "actions",
            header: "",
            className: "text-right",
            render: (r) =>
              r.payrollId ? (
                <span className="text-xs text-muted-foreground">Managed in Payroll</span>
              ) : (
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
                        <AlertDialogTitle>Delete expense?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This permanently removes the {formatPKR(r.amount)} {r.category} expense.
                          This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteMutation.mutate(r.expenseId)}>
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
