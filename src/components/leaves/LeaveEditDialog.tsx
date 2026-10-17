import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { adminAddLeave, adminUpdateLeave, type LeaveRequest } from "@/lib/api/leaves";
import type { Employee } from "@/lib/api/employees";

const LEAVE_TYPES = ["Annual", "Casual", "Sick", "Unpaid", "Absent"];
const STATUSES = ["Approved", "Pending", "Rejected"];

function toDateInput(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function daysBetween(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 0;
  const diff = Math.floor((e.getTime() - s.getTime()) / 86400000) + 1;
  return diff > 0 ? diff : 0;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, the dialog edits this leave; when null it adds a new one. */
  leave: LeaveRequest | null;
  employees: Employee[];
};

export function LeaveEditDialog({ open, onOpenChange, leave, employees }: Props) {
  const qc = useQueryClient();
  const isEdit = !!leave;

  const [employeeId, setEmployeeId] = useState("");
  const [leaveType, setLeaveType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("Approved");
  const [reason, setReason] = useState("");
  const [paidDays, setPaidDays] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    setEmployeeId(leave?.employeeId || "");
    setLeaveType(leave?.leaveType || "");
    setStartDate(toDateInput(leave?.startDate));
    setEndDate(toDateInput(leave?.endDate));
    setStatus(leave?.status || "Approved");
    setReason(leave?.reason || "");
    setPaidDays(leave ? String(leave.paidDays ?? "") : "");
  }, [open, leave]);

  const totalDays = daysBetween(startDate, endDate);

  const mutation = useMutation({
    mutationFn: () => {
      const isUnpaid = leaveType === "Unpaid" || leaveType === "Absent";
      // Default paid/unpaid split: paid types count fully as paid unless the
      // admin overrode the paid days figure.
      // Clamped so a stale override (e.g. after shortening the dates) can
      // never record more paid days than the leave is long.
      const paid =
        paidDays !== ""
          ? Math.min(totalDays, Math.max(0, Number(paidDays) || 0))
          : isUnpaid
            ? 0
            : totalDays;
      const unpaid = Math.max(0, totalDays - paid);

      const data = {
        employeeId,
        employeeCode: employees.find((e) => e.employeeId === employeeId)?.employeeCode,
        leaveType,
        startDate,
        endDate,
        totalDays,
        paidDays: paid,
        unpaidDays: unpaid,
        status,
        reason,
      };

      return isEdit ? adminUpdateLeave(leave!.leaveId, data) : adminAddLeave(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leaveRequests"] });
      onOpenChange(false);
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Failed to save leave."),
  });

  function handleSave() {
    setError("");
    if (!isEdit && !employeeId) {
      setError("Please select an employee.");
      return;
    }
    if (!leaveType) {
      setError("Please choose a leave type.");
      return;
    }
    if (!startDate || !endDate) {
      setError("Start and end dates are required.");
      return;
    }
    if (totalDays <= 0) {
      setError("End date must be on or after start date.");
      return;
    }
    mutation.mutate();
  }

  const employeeName =
    leave?.employeeName || employees.find((e) => e.employeeId === employeeId)?.name;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Correct leave record" : "Add old leave"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? `Adjust the leave record for ${employeeName || "this employee"}.`
              : "Backfill a past leave or absence that isn't in the system yet."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-danger-line bg-danger-tint px-3 py-2 text-xs text-danger-ink"
            >
              {error}
            </div>
          )}

          {isEdit ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border bg-subtle px-3 py-2.5 text-[13px]">
              <span className="text-muted-foreground">Employee</span>
              <span className="truncate font-medium text-foreground">
                {employeeName || leave?.employeeId}
              </span>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Employee</Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.employeeId} value={e.employeeId}>
                      {e.name} — <span className="font-mono">{e.employeeCode}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-x-3 gap-y-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Leave type</Label>
              <Select value={leaveType} onValueChange={setLeaveType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {LEAVE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Start date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>End date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Total days</Label>
              <Input value={totalDays} readOnly className="bg-subtle font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label>Paid days (optional)</Label>
              <Input
                type="number"
                min={0}
                max={totalDays}
                placeholder="Auto"
                className="font-mono"
                value={paidDays}
                onChange={(e) => setPaidDays(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Reason / note</Label>
            <Textarea
              rows={2}
              placeholder="e.g. Backfilled from last year's records"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save leave"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
