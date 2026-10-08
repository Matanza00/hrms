import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import {
  createRecurringExpense,
  deleteRecurringExpense,
  getRecurringExpenses,
  updateRecurringExpense,
  type RecurringExpense,
} from "@/lib/api/accounts";

const categories = ["Salary", "Utilities", "Tools", "Emergency", "Misc", "Reserve"];

function formatPKR(value: number | string | undefined) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const emptyForm = {
  amount: "",
  category: "",
  description: "",
  dayOfMonth: "1",
  startMonth: currentMonth(),
  active: true,
};

/**
 * Manage recurring-expense templates. The backend auto-posts one real expense
 * per month (from startMonth up to the current month) whenever Accounts loads,
 * so these appear in the overview without any manual step.
 */
export function RecurringExpensesManager() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringExpense | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [error, setError] = useState("");

  const { data: recurring = [], isLoading } = useQuery({
    queryKey: ["recurringExpenses"],
    queryFn: getRecurringExpenses,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["recurringExpenses"] });
    qc.invalidateQueries({ queryKey: ["expenses"] });
    qc.invalidateQueries({ queryKey: ["accountsOverview"] });
  };

  const createMutation = useMutation({
    mutationFn: createRecurringExpense,
    onSuccess: () => {
      invalidate();
      close();
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateRecurringExpense,
    onSuccess: () => {
      invalidate();
      close();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: updateRecurringExpense,
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRecurringExpense,
    onSuccess: invalidate,
  });

  const saving = createMutation.isPending || updateMutation.isPending;

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, startMonth: currentMonth() });
    setError("");
    setOpen(true);
  }

  function openEdit(r: RecurringExpense) {
    setEditing(r);
    setForm({
      amount: String(r.amount ?? ""),
      category: r.category || "",
      description: r.description || "",
      dayOfMonth: String(r.dayOfMonth ?? 1),
      startMonth: (r.startMonth || currentMonth()).slice(0, 7),
      active: r.active ?? true,
    });
    setError("");
    setOpen(true);
  }

  function close() {
    setOpen(false);
    setEditing(null);
    setForm({ ...emptyForm, startMonth: currentMonth() });
  }

  async function handleSave() {
    setError("");
    if (!form.category) {
      setError("Category is required.");
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      setError("Amount must be greater than zero.");
      return;
    }
    const payload = {
      amount: Number(form.amount),
      category: form.category,
      description: form.description,
      dayOfMonth: Math.min(28, Math.max(1, Number(form.dayOfMonth) || 1)),
      startMonth: form.startMonth,
      active: form.active,
    };
    try {
      if (editing) {
        await updateMutation.mutateAsync({
          recurringId: editing.recurringId,
          ...payload,
        });
      } else {
        await createMutation.mutateAsync(payload);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    }
  }

  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-accent/10 text-accent">
            <Repeat className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Recurring expenses</h3>
            <p className="text-xs text-muted-foreground">
              Auto-posted once a month into the overview.
            </p>
          </div>
        </div>

        <Button size="sm" variant="outline" onClick={openCreate}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add recurring
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : recurring.length === 0 ? (
        <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
          No recurring expenses yet. Add one (e.g. rent, salaries, internet) and
          it will post automatically each month.
        </p>
      ) : (
        <ul className="divide-y">
          {recurring.map((r) => (
            <li key={r.recurringId} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {r.description || r.category}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatPKR(r.amount)} · {r.category} · day {r.dayOfMonth} · from{" "}
                  {r.startMonth}
                </p>
              </div>

              <Switch
                checked={r.active}
                onCheckedChange={(active) =>
                  toggleMutation.mutate({ recurringId: r.recurringId, active })
                }
                aria-label="Active"
              />

              <Button
                size="sm"
                variant="outline"
                className="h-7"
                onClick={() => openEdit(r)}
              >
                <Pencil className="h-3 w-3" />
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="outline" className="h-7 text-red-600">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete recurring expense?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This stops future auto-posting. Expenses already posted for
                      past months are kept.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteMutation.mutate(r.recurringId)}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit recurring expense" : "Add recurring expense"}
            </DialogTitle>
          </DialogHeader>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Category</Label>
              <Select
                value={form.category}
                onValueChange={(category) =>
                  setForm((p) => ({ ...p, category }))
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

            <div className="space-y-1.5">
              <Label className="text-xs">Day of month (1–28)</Label>
              <Input
                type="number"
                min={1}
                max={28}
                value={form.dayOfMonth}
                onChange={(e) =>
                  setForm((p) => ({ ...p, dayOfMonth: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Starting month</Label>
              <Input
                type="month"
                value={form.startMonth}
                onChange={(e) =>
                  setForm((p) => ({ ...p, startMonth: e.target.value }))
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
                placeholder="e.g. Office rent"
              />
            </div>

            <div className="flex items-center gap-2 sm:col-span-2">
              <Switch
                checked={form.active}
                onCheckedChange={(active) =>
                  setForm((p) => ({ ...p, active }))
                }
                id="recurring-active"
              />
              <Label htmlFor="recurring-active" className="text-xs">
                Active (auto-post each month)
              </Label>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : editing ? "Save changes" : "Add"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
