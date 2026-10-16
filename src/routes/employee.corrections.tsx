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
import { AlertTriangle, CircleCheck, ClockAlert, History } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { ChartCard } from "@/components/shared/ChartCard";
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
  head: () => ({ meta: [{ title: "Corrections — LDS HRMS" }] }),
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
    d.getHours(),
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
            new Date(a.attendanceDate || a.checkIn || "").getTime(),
        ),
    [attendanceRaw, employeeId],
  );

  const myCorrections = (Array.isArray(correctionsRaw) ? correctionsRaw : []).filter(
    (c) => c.employeeId === employeeId,
  );

  const [attendanceId, setAttendanceId] = useState("");
  const [requestType, setRequestType] = useState("");
  const [newValue, setNewValue] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedRecord = myAttendance.find((a) => a.attendanceId === attendanceId);
  const isTimeField = requestType && requestType !== "Status";
  const oldValue = selectedRecord ? String(selectedRecord[FIELD_MAP[requestType]] ?? "") : "";

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
    onError: (err) => setError(err instanceof Error ? err.message : "Failed to submit request."),
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
      <PageHeader
        icon={ClockAlert}
        title="Attendance correction"
        description="Something wrong with your check-in, check-out or break times? Request a correction and an admin will review it."
      />

      <ChartCard
        title="New correction request"
        description="Pick the day, the field and the right value"
        icon={ClockAlert}
        tone="warning"
        bodyClassName=""
      >
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-danger-line bg-danger-tint px-3 py-2.5 text-[13px] text-danger-ink">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-success-line bg-success-tint px-3 py-2.5 text-[13px] text-success-ink">
            <CircleCheck className="mt-0.5 size-3.5 shrink-0" />
            {success}
          </div>
        )}

        <div className="grid gap-x-3 gap-y-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Attendance day</Label>
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
                      {formatDate(a.attendanceDate || a.checkIn)} · {a.attendanceStatus || "—"}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Field to correct</Label>
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
            <Label>Current value</Label>
            <Input
              value={requestType ? formatValue(oldValue) : ""}
              readOnly
              className="bg-subtle font-mono"
              placeholder="Pick a day and field"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Corrected value</Label>
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
                className="font-mono"
                value={newValue}
                disabled={!requestType}
                onChange={(e) => setNewValue(e.target.value)}
              />
            )}
          </div>

          <div className="md:col-span-2 space-y-1.5">
            <Label>Reason</Label>
            <Textarea
              rows={3}
              placeholder="Explain why this needs correcting…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end pb-1">
          <Button
            className="w-full sm:w-auto max-sm:h-11"
            disabled={mutation.isPending}
            onClick={submit}
          >
            {mutation.isPending ? "Submitting…" : "Submit request"}
          </Button>
        </div>
      </ChartCard>

      <div className="mt-6">
        <div className="mb-3 flex items-center gap-1.5">
          <History className="size-3.5 text-muted-foreground" />
          <h3 className="text-sm font-semibold tracking-[-0.2px]">My correction requests</h3>
        </div>
        <DataTable<AttendanceCorrection>
          rowKey={(r) => r.correctionId}
          data={myCorrections}
          empty="You haven't submitted any correction requests yet."
          columns={[
            {
              key: "attendanceDate",
              header: "Date",
              render: (r) => (
                <span className="font-mono text-[13px]">{formatDate(r.attendanceDate)}</span>
              ),
            },
            { key: "requestType", header: "Field", render: (r) => r.requestType || "—" },
            {
              key: "oldValue",
              header: "Old",
              render: (r) => (
                <span className="font-mono text-[13px] text-muted-foreground">
                  {formatValue(r.oldValue)}
                </span>
              ),
            },
            {
              key: "newValue",
              header: "Requested",
              render: (r) => (
                <span className="font-mono text-[13px] font-medium">{formatValue(r.newValue)}</span>
              ),
            },
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
