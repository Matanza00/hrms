import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { generatePayroll } from "@/lib/api/payroll";
import { useEmployees } from "@/hooks/useEmployees";

const ALL = "__all__";

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function isActive(active: boolean | string) {
  return active === true || active === "TRUE" || active === "true";
}

/** Admin: generate (or recalculate) payroll for one employee or everyone. */
export function RunPayrollDialog() {
  const qc = useQueryClient();
  const { data: employeesRaw = [] } = useEmployees();
  const employees = (Array.isArray(employeesRaw) ? employeesRaw : []).filter((e) =>
    isActive(e.active),
  );

  const [open, setOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState(ALL);
  const [month, setMonth] = useState(currentMonth());
  const [bonus, setBonus] = useState("");
  const [recalculate, setRecalculate] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const bonusNum = bonus ? Number(bonus) : 0;
      const targets =
        employeeId === ALL ? employees : employees.filter((e) => e.employeeId === employeeId);
      if (targets.length === 0) throw new Error("No active employees to run payroll for.");

      const outcomes = await Promise.allSettled(
        targets.map((e) =>
          generatePayroll({
            employeeId: e.employeeId,
            month,
            bonus: employeeId === ALL ? 0 : bonusNum,
            recalculate,
          }),
        ),
      );
      const ok = outcomes.filter((o) => o.status === "fulfilled").length;
      const failed = outcomes.length - ok;
      return { ok, failed };
    },
    onSuccess: ({ ok, failed }) => {
      qc.invalidateQueries({ queryKey: ["payroll"] });
      qc.invalidateQueries({ queryKey: ["accountsOverview"] });
      setResult(
        `Generated ${ok} payslip${ok === 1 ? "" : "s"}` +
          (failed ? ` · ${failed} skipped (already generated — tick recalculate to overwrite)` : ""),
      );
      if (!failed) {
        setTimeout(() => setOpen(false), 900);
      }
    },
    onError: (err) =>
      setError(err instanceof Error ? err.message : "Failed to run payroll."),
  });

  function run() {
    setError("");
    setResult("");
    if (!month) {
      setError("Pick a month.");
      return;
    }
    mutation.mutate();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setError("");
          setResult("");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">Run payroll</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Run payroll</DialogTitle>
          <DialogDescription>
            Generate payslips from attendance, leaves and salary for the selected
            month.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        {result && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            {result}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">Employee</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All active employees</SelectItem>
                {employees.map((e) => (
                  <SelectItem key={e.employeeId} value={e.employeeId}>
                    {e.name} — {e.employeeCode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Month</Label>
            <Input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>

          {employeeId !== ALL && (
            <div className="space-y-1.5">
              <Label className="text-xs">Bonus (PKR, optional)</Label>
              <Input
                type="number"
                value={bonus}
                onChange={(e) => setBonus(e.target.value)}
              />
            </div>
          )}

          <label className="flex items-center gap-2 sm:col-span-2 text-sm">
            <Checkbox
              checked={recalculate}
              onCheckedChange={(v) => setRecalculate(v === true)}
            />
            Recalculate if a payslip already exists for this month
          </label>
        </div>

        <Button onClick={run} disabled={mutation.isPending}>
          {mutation.isPending ? "Running…" : "Run payroll"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
