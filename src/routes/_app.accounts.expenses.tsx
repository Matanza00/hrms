import { createFileRoute } from "@tanstack/react-router";
import { DataTable } from "@/components/shared/DataTable";
import { ChartCard } from "@/components/shared/ChartCard";
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
import { ChartPie, Plus, Receipt } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createExpense, getExpenses, type Expense } from "@/lib/api/accounts";
import { useState } from "react";

const categories = ["Salary", "Utilities", "Tools", "Emergency", "Misc", "Reserve"];

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

function ExpensesPage() {
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    expenseDate: "",
    category: "",
    description: "",
    amount: "",
  });
  const [error, setError] = useState("");

  const {
    data: expenses = [],
    isLoading,
    error: loadError,
  } = useQuery({
    queryKey: ["expenses"],
    queryFn: getExpenses,
  });

  const createMutation = useMutation({
    mutationFn: createExpense,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["reserveLedger"] });
      qc.invalidateQueries({ queryKey: ["accountsOverview"] });

      setOpen(false);
      setForm({
        expenseDate: "",
        category: "",
        description: "",
        amount: "",
      });
    },
  });

  const byCat = categories.map((c, i) => ({
    name: c,
    value: expenses.filter((e) => e.category === c).reduce((a, b) => a + Number(b.amount || 0), 0),
    color: colors[i],
  }));

  const hasExpenses = byCat.some((c) => c.value > 0);

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

      await createMutation.mutateAsync({
        expenseDate: form.expenseDate,
        category: form.category,
        description: form.description,
        amount: Number(form.amount),
      });
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

      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus />
              Record expense
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record expense</DialogTitle>
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
                  value={form.expenseDate}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      expenseDate: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(value) =>
                    setForm((p) => ({
                      ...p,
                      category: value,
                    }))
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

              <div className="sm:col-span-2 space-y-1.5">
                <Label>Description</Label>
                <Input
                  value={form.description}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      description: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label>Amount</Label>
                <Input
                  type="number"
                  value={form.amount}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      amount: e.target.value,
                    }))
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
              <span className="inline-flex h-[22px] items-center rounded-sm border bg-subtle px-2 text-xs font-medium text-text-secondary">
                {r.category || "—"}
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
        ]}
      />
    </div>
  );
}
