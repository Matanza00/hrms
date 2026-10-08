import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Sun } from "lucide-react";
import { useEmployees } from "@/hooks/useEmployees";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createSpecialWorkingDay,
  getSpecialWorkingDays,
  type SpecialWorkingDay,
} from "@/lib/api/specialWorkingDays";
import { useState } from "react";

export const Route = createFileRoute("/_app/special-working-days")({
  component: SpecialWorkingDaysPage,
});

function initials(name?: string) {
  if (!name) return "NA";

  return name
    .split(" ")
    .filter(Boolean)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
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

function sameDay(value?: string, day?: number) {
  if (!value || !day) return false;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === day
  );
}

function parseAssignedIds(value?: string) {
  return String(value || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function SpecialWorkingDaysPage() {
  const qc = useQueryClient();

  const { data: employees = [], isLoading: employeesLoading } = useEmployees();

  const {
    data: specialDays = [],
    isLoading: daysLoading,
    error,
  } = useQuery({
    queryKey: ["specialWorkingDays"],
    queryFn: getSpecialWorkingDays,
  });

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [workingDate, setWorkingDate] = useState("");
  const [allEmployees, setAllEmployees] = useState(false);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [formError, setFormError] = useState("");

  const createMutation = useMutation({
    mutationFn: createSpecialWorkingDay,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["specialWorkingDays"] });
      setOpen(false);
      setTitle("");
      setWorkingDate("");
      setAllEmployees(false);
      setSelectedEmployeeIds([]);
    },
  });

  function toggleEmployee(employeeId: string) {
    setSelectedEmployeeIds((prev) =>
      prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId]
    );
  }

  async function handleSave() {
    try {
      setFormError("");

      if (!title.trim()) {
        setFormError("Title is required.");
        return;
      }

      if (!workingDate) {
        setFormError("Working date is required.");
        return;
      }

      if (!allEmployees && selectedEmployeeIds.length === 0) {
        setFormError("Select at least one employee or enable all employees.");
        return;
      }

      await createMutation.mutateAsync({
        title: title.trim(),
        workingDate,
        allEmployees,
        assignedEmployeeIds: allEmployees ? "" : selectedEmployeeIds.join(","),
      });
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to create working day."
      );
    }
  }

  const isLoading = employeesLoading || daysLoading;

  if (isLoading) {
    return (
      <div>
        <PageHeader
          title="Special working days"
          description="Override holidays for selected employees when work is required."
        />
        <div className="rounded-2xl border bg-card shadow-xs p-6 text-sm text-muted-foreground">
          Loading special working days...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader
          title="Special working days"
          description="Override holidays for selected employees when work is required."
        />
        <div role="alert" className="rounded-2xl border border-destructive/25 bg-destructive/10 p-6 text-sm text-[oklch(0.5_0.23_27)] dark:text-[oklch(0.78_0.23_27)]">
          {error instanceof Error ? error.message : "Something went wrong"}
        </div>
      </div>
    );
  }

  const currentMonthDays = Array.from({ length: 31 }).map((_, i) => i + 1);

  const latestDay = specialDays[0];

  const assignedIds = parseAssignedIds(latestDay?.assignedEmployeeIds);

  const assignedEmployees =
    latestDay?.allEmployees === true || latestDay?.allEmployees === "TRUE"
      ? employees
      : employees.filter((e) => assignedIds.includes(e.employeeId));

  return (
    <div>
      <PageHeader
        title="Special working days"
        description="Override holidays for selected employees when work is required."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Schedule day
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>Schedule special working day</DialogTitle>
              </DialogHeader>

              {formError && (
                <div role="alert" className="rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-[oklch(0.5_0.23_27)] dark:text-[oklch(0.78_0.23_27)]">
                  {formError}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-xs">Title</Label>
                  <Input
                    placeholder="Eid workload / urgent delivery"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Working date</Label>
                  <Input
                    type="date"
                    value={workingDate}
                    onChange={(e) => setWorkingDate(e.target.value)}
                  />
                </div>

                <label className="flex items-center gap-2 pt-6 text-sm">
                  <Checkbox
                    checked={allEmployees}
                    onCheckedChange={(v) => setAllEmployees(Boolean(v))}
                  />
                  All employees
                </label>
              </div>

              {!allEmployees && (
                <div className="max-h-80 overflow-y-auto divide-y">
                  {employees.map((e) => (
                    <label
                      key={e.employeeId}
                      className="flex items-center gap-3 py-2.5 cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedEmployeeIds.includes(e.employeeId)}
                        onCheckedChange={() => toggleEmployee(e.employeeId)}
                      />

                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-[10px] bg-muted">
                          {initials(e.name)}
                        </AvatarFallback>
                      </Avatar>

                      <div>
                        <p className="text-sm font-medium">{e.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {e.department || "—"}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              <Button onClick={handleSave} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Saving..." : "Assign"}
              </Button>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border bg-card shadow-xs p-5">
          <h3 className="text-sm font-semibold mb-4">Current month calendar</h3>

          <div className="grid grid-cols-7 gap-1 text-center">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <div
                key={i}
                className="text-[11px] font-medium text-muted-foreground py-1.5"
              >
                {d}
              </div>
            ))}

            {currentMonthDays.map((day) => {
              const isSpecial = specialDays.some((d) =>
                sameDay(d.workingDate, day)
              );

              const weekend = new Date(
                new Date().getFullYear(),
                new Date().getMonth(),
                day
              ).getDay();

              const isWeekend = weekend === 0 || weekend === 6;

              return (
                <div
                  key={day}
                  className={`aspect-square grid place-items-center rounded-lg text-xs ${
                    isSpecial
                      ? "bg-accent text-accent-foreground font-semibold"
                      : isWeekend
                        ? "bg-muted/50 text-muted-foreground"
                        : "hover:bg-muted"
                  }`}
                >
                  {day}
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border bg-card shadow-xs p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
            <Sun className="h-4 w-4 text-[oklch(0.78_0.16_75)]" />
            Latest assignment
          </h3>

          {!latestDay ? (
            <p className="text-sm text-muted-foreground">
              No special working days scheduled.
            </p>
          ) : (
            <>
              <div className="mb-4 rounded-xl border bg-muted/40 p-3 text-sm">
                <p className="font-medium">{latestDay.title}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(latestDay.workingDate)}
                </p>
              </div>

              <ul className="space-y-3">
                {assignedEmployees.slice(0, 8).map((e) => (
                  <li key={e.employeeId} className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-[10px] bg-muted">
                        {initials(e.name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <p className="text-sm font-medium">{e.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(latestDay.workingDate)} · Override
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}