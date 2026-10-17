import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarCheck, CalendarDays, Plus, Sun, Users } from "lucide-react";
import { ChartCard } from "@/components/shared/ChartCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { cn } from "@/lib/utils";
import { useEmployees } from "@/hooks/useEmployees";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createSpecialWorkingDay,
  getSpecialWorkingDays,
  type SpecialWorkingDay,
} from "@/lib/api/specialWorkingDays";
import { useState } from "react";

export const Route = createFileRoute("/_app/special-working-days")({
  head: () => ({ meta: [{ title: "Special Working Days — LDS HRMS" }] }),
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
      prev.includes(employeeId) ? prev.filter((id) => id !== employeeId) : [...prev, employeeId],
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
      setFormError(err instanceof Error ? err.message : "Failed to create working day.");
    }
  }

  const isLoading = employeesLoading || daysLoading;

  if (isLoading) {
    return (
      <div>
        <PageHeader
          icon={CalendarCheck}
          title="Special working days"
          description="Override holidays for selected employees when work is required."
        />
        <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
          Loading special working days...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader
          icon={CalendarCheck}
          title="Special working days"
          description="Override holidays for selected employees when work is required."
        />
        <div role="alert" className="rounded-lg border border-danger-line bg-danger-tint p-4 text-[13px] text-danger-ink">
          {error instanceof Error ? error.message : "Something went wrong"}
        </div>
      </div>
    );
  }

  // Lay the month out under the weekday headings: blank cells before the 1st,
  // and only as many days as this month actually has.
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const leadingBlanks = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
  const currentMonthDays = Array.from({ length: daysInMonth }).map((_, i) => i + 1);
  const monthLabel = now.toLocaleDateString("en-PK", { month: "long", year: "numeric" });

  const latestDay = specialDays[0];

  const assignedIds = parseAssignedIds(latestDay?.assignedEmployeeIds);

  const assignedEmployees =
    latestDay?.allEmployees === true || latestDay?.allEmployees === "TRUE"
      ? employees
      : employees.filter((e) => assignedIds.includes(e.employeeId));

  return (
    <div>
      <PageHeader
        icon={CalendarCheck}
        title="Special working days"
        description="Override holidays for selected employees when work is required."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus />
                Schedule day
              </Button>
            </DialogTrigger>

            <DialogContent className="max-h-[90svh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Schedule special working day</DialogTitle>
                <DialogDescription>
                  The chosen employees are expected to work on this date even if it is a holiday.
                </DialogDescription>
              </DialogHeader>

              {formError && (
                <div role="alert" className="rounded-lg border border-danger-line bg-danger-tint px-3 py-2 text-xs text-danger-ink">
                  {formError}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2 sm:gap-x-3">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label>Title</Label>
                  <Input
                    placeholder="Eid workload / urgent delivery"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Working date</Label>
                  <Input
                    type="date"
                    value={workingDate}
                    onChange={(e) => setWorkingDate(e.target.value)}
                  />
                </div>

                <label className="flex cursor-pointer items-center gap-2 text-sm sm:pt-6">
                  <Checkbox
                    checked={allEmployees}
                    onCheckedChange={(v) => setAllEmployees(Boolean(v))}
                  />
                  All employees
                </label>
              </div>

              {!allEmployees && (
                <div className="max-h-80 divide-y divide-divider overflow-y-auto rounded-lg border px-3">
                  {employees.map((e) => (
                    <label
                      key={e.employeeId}
                      className="flex items-center gap-3 py-2.5 cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedEmployeeIds.includes(e.employeeId)}
                        onCheckedChange={() => toggleEmployee(e.employeeId)}
                      />

                      <Avatar className="size-8">
                        <AvatarFallback className="bg-muted text-[11px] text-text-secondary">
                          {initials(e.name)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0">
                        <p className="text-sm font-medium">{e.name}</p>
                        <p className="text-xs text-muted-foreground">{e.department || "—"}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              <DialogFooter className="gap-2 sm:space-x-0">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Saving..." : "Assign"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid items-start gap-4 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <ChartCard
            icon={CalendarDays}
            title="Current month calendar"
            description={monthLabel}
            bodyClassName=""
          >
            <div className="grid grid-cols-7 gap-1 text-center">
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <div
                  key={i}
                  className="py-1.5 font-mono text-[11px] font-medium text-muted-foreground"
                >
                  {d}
                </div>
              ))}

              {Array.from({ length: leadingBlanks }).map((_, i) => (
                <div key={`blank-${i}`} aria-hidden />
              ))}

              {currentMonthDays.map((day) => {
                const isSpecial = specialDays.some((d) => sameDay(d.workingDate, day));

                const weekday = new Date(now.getFullYear(), now.getMonth(), day).getDay();

                const isWeekend = weekday === 0 || weekday === 6;
                const isToday = day === now.getDate();

                return (
                  <div
                    key={day}
                    className={cn(
                      "grid aspect-square place-items-center rounded-md font-mono text-xs",
                      isSpecial
                        ? "bg-info font-medium text-white"
                        : isWeekend
                          ? "bg-subtle text-muted-foreground"
                          : "hover:bg-muted",
                      isToday && !isSpecial && "border border-foreground font-medium",
                    )}
                  >
                    {day}
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-[2px] bg-info" />
                Special working day
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-[2px] border bg-subtle" />
                Weekend
              </span>
            </div>
          </ChartCard>
        </div>

        <ChartCard icon={Sun} tone="warning" title="Latest assignment" bodyClassName="">
          {!latestDay ? (
            <EmptyState icon={Sun} title="No special working days scheduled." />
          ) : (
            <>
              <div className="mb-4 rounded-lg border bg-subtle px-3 py-2.5">
                <p className="text-sm font-medium">{latestDay.title}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {formatDate(latestDay.workingDate)}
                </p>
              </div>

              {assignedEmployees.length === 0 ? (
                <EmptyState icon={Users} title="No employees assigned." />
              ) : (
                <ul className="space-y-3">
                  {assignedEmployees.slice(0, 8).map((e) => (
                    <li key={e.employeeId} className="flex items-center gap-3">
                      <Avatar className="size-8">
                        <AvatarFallback className="bg-muted text-[11px] text-text-secondary">
                          {initials(e.name)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{e.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(latestDay.workingDate)} · Override
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
