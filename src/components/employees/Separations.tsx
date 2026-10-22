import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DoorOpen, LogOut } from "lucide-react";
import { ChartCard } from "@/components/shared/ChartCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  cancelSeparation,
  decideResignation,
  getSeparations,
  recordSeparation,
  type Separation,
} from "@/lib/api/separations";
import { formatDay } from "@/lib/formatDay";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** Refresh everything a separation change touches. */
function useInvalidateSeparations(employeeId?: string) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["separations"] });
    qc.invalidateQueries({ queryKey: ["employees"] });
    if (employeeId) qc.invalidateQueries({ queryKey: ["employee", employeeId] });
    else qc.invalidateQueries({ queryKey: ["employee"] });
  };
}

function ErrorNote({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="rounded-lg border border-danger-line bg-danger-tint px-3 py-2 text-[13px] text-danger-ink"
    >
      {message}
    </div>
  );
}

/** Admin records a resignation or termination for an employee. */
export function OffboardDialog({
  employeeId,
  employeeName,
}: {
  employeeId: string;
  employeeName: string;
}) {
  const invalidate = useInvalidateSeparations(employeeId);
  const empty = {
    type: "Resignation" as "Resignation" | "Termination",
    noticeDate: todayStr(),
    lastWorkingDay: "",
    reason: "",
    note: "",
  };
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () => recordSeparation({ employeeId, ...form }),
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setForm(empty);
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Could not save."),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.noticeDate) return setError("Enter the notice date.");
    if (!form.lastWorkingDay) return setError("Enter the last working day.");
    if (form.lastWorkingDay < form.noticeDate)
      return setError("The last working day can't be before the notice date.");
    mutation.mutate();
  }

  const set = (key: keyof typeof empty) => (value: string) =>
    setForm((p) => ({ ...p, [key]: value }));

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setError("");
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <DoorOpen />
          Offboard
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Offboard {employeeName}</DialogTitle>
          <DialogDescription>
            They serve notice until the last working day and can still sign in. After that day their
            login switches off automatically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <ErrorNote message={error} />

          <div className="space-y-1.5">
            <Label htmlFor="sep-type">Type</Label>
            <Select value={form.type} onValueChange={set("type")}>
              <SelectTrigger id="sep-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Resignation">Resignation (they resigned)</SelectItem>
                <SelectItem value="Termination">Termination (let go / fired)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sep-notice">
                {form.type === "Resignation" ? "Resignation date" : "Termination date"}
              </Label>
              <Input
                id="sep-notice"
                type="date"
                value={form.noticeDate}
                onChange={(e) => set("noticeDate")(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sep-last">Last working day</Label>
              <Input
                id="sep-last"
                type="date"
                value={form.lastWorkingDay}
                onChange={(e) => set("lastWorkingDay")(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sep-reason">Reason</Label>
            <Textarea
              id="sep-reason"
              value={form.reason}
              onChange={(e) => set("reason")(e.target.value)}
              placeholder={
                form.type === "Resignation" ? "e.g. Moving to another city" : "e.g. Misconduct"
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sep-note">Internal note (optional)</Label>
            <Input
              id="sep-note"
              value={form.note}
              onChange={(e) => set("note")(e.target.value)}
              placeholder="Handover, final settlement, assets to return…"
            />
          </div>

          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending
              ? "Saving..."
              : form.type === "Resignation"
                ? "Record resignation"
                : "Record termination"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Admin accepts (setting the last working day) or rejects a handed-in resignation. */
export function DecideResignationDialog({ sep }: { sep: Separation }) {
  const invalidate = useInvalidateSeparations(sep.employeeId);
  const [open, setOpen] = useState(false);
  const [lastWorkingDay, setLastWorkingDay] = useState(
    String(sep.requestedLastDay ?? "").slice(0, 10),
  );
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: (decision: "approve" | "reject") =>
      decideResignation({
        separationId: sep.separationId,
        decision,
        lastWorkingDay: decision === "approve" ? lastWorkingDay : undefined,
        note: note.trim() || undefined,
      }),
    onSuccess: () => {
      invalidate();
      setOpen(false);
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Could not save."),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setError("");
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">Review</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resignation from {sep.employeeName || "employee"}</DialogTitle>
          <DialogDescription>
            Handed in {formatDay(sep.noticeDate)} · proposed last day{" "}
            {formatDay(sep.requestedLastDay)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <ErrorNote message={error} />
          {sep.reason && (
            <div className="rounded-lg border bg-subtle px-3 py-2 text-[13px] text-text-secondary">
              {sep.reason}
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor={`lwd-${sep.separationId}`}>Last working day (if accepted)</Label>
            <Input
              id={`lwd-${sep.separationId}`}
              type="date"
              value={lastWorkingDay}
              onChange={(e) => setLastWorkingDay(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`note-${sep.separationId}`}>Note (optional)</Label>
            <Input
              id={`note-${sep.separationId}`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={mutation.isPending || !lastWorkingDay}
              onClick={() => mutation.mutate("approve")}
            >
              Accept resignation
            </Button>
            <Button
              variant="outline"
              className="text-danger-ink"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate("reject")}
            >
              Reject
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Admin withdraws a pending/approved separation before the last working day. */
function CancelSeparationButton({ sep }: { sep: Separation }) {
  const invalidate = useInvalidateSeparations(sep.employeeId);
  const [error, setError] = useState("");
  const mutation = useMutation({
    mutationFn: () => cancelSeparation({ separationId: sep.separationId }),
    onSuccess: invalidate,
    onError: (err) => setError(err instanceof Error ? err.message : "Could not cancel."),
  });
  return (
    <div className="space-y-2">
      <ErrorNote message={error} />
      <Button
        size="sm"
        variant="outline"
        disabled={mutation.isPending}
        onClick={() => {
          setError("");
          mutation.mutate();
        }}
      >
        {sep.type === "Resignation" ? "Withdraw resignation" : "Cancel termination"}
      </Button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

/** Employee page: their latest separation, if any. */
export function SeparationCard({ employeeId }: { employeeId: string }) {
  const { data = [] } = useQuery({
    queryKey: ["separations", employeeId],
    queryFn: () => getSeparations(employeeId),
  });
  const sep = data.find((s) => s.status === "Pending" || s.status === "Approved") ?? data[0];
  if (!sep || sep.status === "Rejected" || sep.status === "Cancelled") return null;

  return (
    <ChartCard
      title={sep.type}
      icon={LogOut}
      tone={sep.type === "Termination" ? "danger" : "warning"}
      action={
        <StatusBadge
          status={sep.status === "Approved" ? "Notice period" : sep.status}
          label={
            sep.status === "Approved"
              ? "Serving notice"
              : sep.status === "Completed"
                ? "Left"
                : "Awaiting review"
          }
        />
      }
      bodyClassName=""
    >
      <div className="space-y-2.5 text-[13px]">
        <Row
          label={sep.type === "Resignation" ? "Resigned on" : "Terminated on"}
          value={formatDay(sep.noticeDate)}
        />
        {sep.status === "Pending" ? (
          <Row label="Proposed last day" value={formatDay(sep.requestedLastDay)} />
        ) : (
          <Row label="Last working day" value={formatDay(sep.lastWorkingDay)} />
        )}
        {sep.reason && <Row label="Reason" value={sep.reason} />}
        {sep.adminNote && <Row label="Note" value={sep.adminNote} />}
        {sep.decidedBy && <Row label="Recorded by" value={sep.decidedBy} />}

        {(sep.status === "Pending" || sep.status === "Approved") && (
          <div className="flex flex-wrap gap-2 border-t border-divider pt-3">
            {sep.status === "Pending" && <DecideResignationDialog sep={sep} />}
            <CancelSeparationButton sep={sep} />
          </div>
        )}
      </div>
    </ChartCard>
  );
}

/** Employees page: resignations handed in by employees, waiting for an admin. */
export function ResignationRequests() {
  const { data = [] } = useQuery({
    queryKey: ["separations"],
    queryFn: () => getSeparations(),
  });
  const pending = data.filter((s) => s.status === "Pending");
  if (pending.length === 0) return null;

  return (
    <div className="mb-4">
      <ChartCard
        icon={LogOut}
        tone="warning"
        title="Resignations to review"
        description="Accept with a last working day, or reject."
        bodyClassName=""
      >
        <ul className="-my-2.5 divide-y divide-divider">
          {pending.map((s) => (
            <li
              key={s.separationId}
              className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 text-[13px]">
                <p className="truncate font-medium">{s.employeeName || "Employee"}</p>
                <p className="text-muted-foreground">
                  Handed in {formatDay(s.noticeDate)} · proposed last day{" "}
                  {formatDay(s.requestedLastDay)}
                </p>
              </div>
              <DecideResignationDialog sep={s} />
            </li>
          ))}
        </ul>
      </ChartCard>
    </div>
  );
}
