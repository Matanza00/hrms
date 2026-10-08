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
import { Plus } from "lucide-react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
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
    value: expenses
      .filter((e) => e.category === c)
      .reduce((a, b) => a + Number(b.amount || 0), 0),
    color: colors[i],
  }));

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
              <li
                key={c.name}
                className="flex items-center justify-between"
              >
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

      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Record expense
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record expense</DialogTitle>
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
                <Label className="text-xs">Category</Label>
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
                <Label className="text-xs">Description</Label>
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
                <Label className="text-xs">Amount</Label>
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
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">
                {r.category || "—"}
              </span>
            ),
          },
          {
            key: "description",
            header: "Description",
            render: (r) => (
              <span className="font-medium">
                {r.description || "—"}
              </span>
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
        ]}
      />
    </div>
  );
}