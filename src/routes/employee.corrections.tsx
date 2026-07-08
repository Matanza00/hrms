import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useAttendance } from "@/hooks/useAttendance";
import {
  getAttendanceCorrections,
  requestAttendanceCorrection,
  type AttendanceCorrection,
  type AttendanceRecord,
} from "@/lib/api/attendance";
import { useAuth } from "@/lib/auth/AuthContext";

export const Route = createFileRoute("/employee/corrections")({
  component: EmployeeCorrections,
});

const STATUS_OPTIONS = ["Present", "Absent", "Half Day", "Late", "Leave"];

/** Which attendance field each request type maps to. */
const FIELD_MAP: Record<string, keyof AttendanceRecord> = {
  "Check In": "checkIn",
  "Check Out": "checkOut",
  "Break Start": "breakStart",
  "Break End": "breakEnd",
  Status: "attendanceStatus",
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

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
  return Number.isNaN(d.getTime()) ? value : d.toISOString();
}

function formatValue(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? String(value)
    : d.toLocaleString("en-PK", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

function formatDate(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? String(value)
    : d.toLocaleDateString("en-PK", { year: "numeric", month: "short", day: "numeric" });
}

function EmployeeCorrections() {
  const qc = useQueryClient();
  const { employeeId, employeeCode, employee, user } = useAuth();

  const { data: attendanceRaw = [] } = useAttendance();
  const { data: correctionsRaw = [] } = useQuery({
    queryKey: ["attendanceCorrections"],
    queryFn: getAttendanceCorrections,
  });

  const myAttendance = useMemo(
    () =>
      (Array.isArray(attendanceRaw) ? attendanceRaw : [])
        .filter((a) => a.employeeId === employeeId)
        .sort(
          (a, b) =>
            new Date(b.attendanceDate || b.checkIn || "").getTime() -
            new Date(a.attendanceDate || a.checkIn || "").getTime()
        ),
    [attendanceRaw, employeeId]
  );

  const myCorrections = (Array.isArray(correctionsRaw) ? correctionsRaw : []).filter(
    (c) => c.employeeId === employeeId
  );

  const [attendanceId, setAttendanceId] = useState("");
  const [requestType, setRequestType] = useState("");
  const [newValue, setNewValue] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedRecord = myAttendance.find((a) => a.attendanceId === attendanceId);
  const isTimeField = requestType && requestType !== "Status";
  const oldValue = selectedRecord
    ? String(selectedRecord[FIELD_MAP[requestType]] ?? "")
    : "";

  const mutation = useMutation({
    mutationFn: requestAttendanceCorrection,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendanceCorrections"] });
      setSuccess("Correction request submitted. An admin will review it.");
      setAttendanceId("");
      setRequestType("");
      setNewValue("");
      setReason("");
    },
    onError: (err) =>
      setError(err instanceof Error ? err.message : "Failed to submit request."),
  });

  function submit() {
    setError("");
    setSuccess("");
    if (!attendanceId) return setError("Select the attendance day you want corrected.");
    if (!requestType) return setError("Select which field to correct.");
    if (!newValue) return setError("Enter the corrected value.");
    if (!reason.trim()) return setError("Please give a reason for the correction.");

    mutation.mutate({
      employeeId: employeeId ?? undefined,
      employeeCode: employeeCode ?? undefined,
      employeeName: employee?.name || user?.username,
      attendanceDate: selectedRecord?.attendanceDate || selectedRecord?.checkIn || "",
      requestType,
      oldValue,
      newValue: isTimeField ? fromLocalInput(newValue) : newValue,
      reason: reason.trim(),
    });
  }

  return (
    <div>
      <h1 className="text-3xl font-bold">Attendance Correction</h1>
      <p className="text-muted-foreground">
        Something wrong with your check-in, check-out or break times? Request a
        correction and an admin will review it.
      </p>

      <div className="mt-6 rounded-2xl border bg-card p-5">
        <h3 className="mb-4 text-sm font-semibold">New correction request</h3>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            {success}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Attendance day</Label>
            <Select
              value={attendanceId}
              onValueChange={(v) => {
                setAttendanceId(v);
                setNewValue("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a day" />
              </SelectTrigger>
              <SelectContent>
                {myAttendance.length === 0 ? (
                  <SelectItem value="none" disabled>
                    No attendance records
                  </SelectItem>
                ) : (
                  myAttendance.map((a) => (
                    <SelectItem key={a.attendanceId} value={a.attendanceId}>
                      {formatDate(a.attendanceDate || a.checkIn)} ·{" "}
                      {a.attendanceStatus || "—"}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Field to correct</Label>
            <Select
              value={requestType}
              onValueChange={(v) => {
                setRequestType(v);
                setNewValue("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select field" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(FIELD_MAP).map((k) => (
                  <SelectItem key={k} value={k}>
                    {k}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Current value</Label>
            <Input
              value={requestType ? formatValue(oldValue) : ""}
              readOnly
              placeholder="Pick a day and field"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Corrected value</Label>
            {requestType === "Status" ? (
              <Select value={newValue} onValueChange={setNewValue}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                type="datetime-local"
                value={newValue}
                disabled={!requestType}
                onChange={(e) => setNewValue(e.target.value)}
              />
            )}
          </div>

          <div className="md:col-span-2 space-y-1.5">
            <Label className="text-xs">Reason</Label>
            <Textarea
              rows={3}
              placeholder="Explain why this needs correcting…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>

        <Button className="mt-4" disabled={mutation.isPending} onClick={submit}>
          {mutation.isPending ? "Submitting…" : "Submit request"}
        </Button>
      </div>

      <div className="mt-6">
        <h3 className="mb-3 text-sm font-semibold">My correction requests</h3>
        <DataTable<AttendanceCorrection>
          rowKey={(r) => r.correctionId}
          data={myCorrections}
          empty="You haven't submitted any correction requests yet."
          columns={[
            { key: "attendanceDate", header: "Date", render: (r) => formatDate(r.attendanceDate) },
            { key: "requestType", header: "Field", render: (r) => r.requestType || "—" },
            { key: "oldValue", header: "Old", render: (r) => formatValue(r.oldValue) },
            { key: "newValue", header: "Requested", render: (r) => formatValue(r.newValue) },
            {
              key: "reason",
              header: "Reason",
              render: (r) => (
                <span className="text-muted-foreground line-clamp-1">{r.reason || "—"}</span>
              ),
            },
            { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
          ]}
        />
      </div>
    </div>
  );
}
