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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  adminCreateAttendance,
  adminUpdateAttendance,
  type AttendanceRecord,
} from "@/lib/api/attendance";
import type { Employee } from "@/lib/api/employees";

const STATUSES = ["Present", "Absent", "Half Day", "Late", "Leave", "Holiday"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** ISO/parseable datetime → "YYYY-MM-DDTHH:mm" for a datetime-local input. */
function toLocalInput(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string) {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

function toDateInput(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, the dialog edits this record; when null it creates a new one. */
  record: AttendanceRecord | null;
  employees: Employee[];
};

export function AttendanceEditDialog({
  open,
  onOpenChange,
  record,
  employees,
}: Props) {
  const qc = useQueryClient();
  const isEdit = !!record;

  const [employeeId, setEmployeeId] = useState("");
  const [attendanceDate, setAttendanceDate] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [breakStart, setBreakStart] = useState("");
  const [breakEnd, setBreakEnd] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  // Seed the form whenever the dialog opens or the target record changes.
  useEffect(() => {
    if (!open) return;
    setError("");
    setEmployeeId(record?.employeeId || "");
    setAttendanceDate(toDateInput(record?.attendanceDate || record?.checkIn));
    setCheckIn(toLocalInput(record?.checkIn));
    setCheckOut(toLocalInput(record?.checkOut));
    setBreakStart(toLocalInput(record?.breakStart));
    setBreakEnd(toLocalInput(record?.breakEnd));
    setStatus(record?.attendanceStatus || "");
  }, [open, record]);

  const mutation = useMutation({
    mutationFn: (payload: {
      employeeId: string;
      employeeCode?: string;
      attendanceDate: string;
      checkIn: string;
      checkOut: string;
      breakStart: string;
      breakEnd: string;
      attendanceStatus: string;
    }) => {
      const data = {
        employeeId: payload.employeeId,
        employeeCode: payload.employeeCode,
        attendanceDate: payload.attendanceDate,
        checkIn: payload.checkIn,
        checkOut: payload.checkOut,
        breakStart: payload.breakStart,
        breakEnd: payload.breakEnd,
        attendanceStatus: payload.attendanceStatus,
      };
      return isEdit
        ? adminUpdateAttendance(record!.attendanceId, data)
        : adminCreateAttendance(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendance"] });
      onOpenChange(false);
    },
    onError: (err) =>
      setError(err instanceof Error ? err.message : "Failed to save attendance."),
  });

  function handleSave() {
    setError("");
    if (!isEdit && !employeeId) {
      setError("Please select an employee.");
      return;
    }
    if (!attendanceDate) {
      setError("Attendance date is required.");
      return;
    }
    if (checkIn && checkOut && new Date(checkOut) < new Date(checkIn)) {
      setError("Check-out cannot be before check-in.");
      return;
    }

    const employee = employees.find((e) => e.employeeId === employeeId);

    mutation.mutate({
      employeeId,
      employeeCode: employee?.employeeCode,
      attendanceDate,
      checkIn: fromLocalInput(checkIn),
      checkOut: fromLocalInput(checkOut),
      breakStart: fromLocalInput(breakStart),
      breakEnd: fromLocalInput(breakEnd),
      attendanceStatus: status,
    });
  }

  const employeeName =
    record?.employeeName ||
    employees.find((e) => e.employeeId === employeeId)?.name;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit attendance" : "Add attendance record"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? `Directly correct the times for ${employeeName || "this employee"}. Working hours are recalculated on save.`
              : "Manually add an attendance record for a past day."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          {isEdit ? (
            <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Employee: </span>
              <span className="font-medium">{employeeName || record?.employeeId}</span>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-xs">Employee</Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.employeeId} value={e.employeeId}>
                      {e.name} — {e.employeeCode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Date</Label>
              <Input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
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
              <Label className="text-xs">Check In</Label>
              <Input
                type="datetime-local"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Check Out</Label>
              <Input
                type="datetime-local"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Break Start</Label>
              <Input
                type="datetime-local"
                value={breakStart}
                onChange={(e) => setBreakStart(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Break End</Label>
              <Input
                type="datetime-local"
                value={breakEnd}
                onChange={(e) => setBreakEnd(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
