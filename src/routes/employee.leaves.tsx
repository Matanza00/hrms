import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { applyLeave, getLeaveRequests, type LeaveRequest } from "@/lib/api/leaves";
import {
  AlertTriangle,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CalendarPlus,
  Hourglass,
  History,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { ChartCard } from "@/components/shared/ChartCard";
import { StatCard } from "@/components/shared/StatCard";
import { DataTable } from "@/components/shared/DataTable";
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
import { useAuth } from "@/lib/auth/AuthContext";
import { useEmployeeStats } from "@/hooks/useEmployeeStats";

export const Route = createFileRoute("/employee/leaves")({
  head: () => ({ meta: [{ title: "My Leaves — LDS HRMS" }] }),
  component: EmployeeLeaves,
});

function days(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 0;
  return Math.floor((e.getTime() - s.getTime()) / 86400000) + 1;
}

function EmployeeLeaves() {
  const qc = useQueryClient();
  const { employeeId, employeeCode } = useAuth();
  const {
    data: raw = [],
    isLoading,
    error: loadError,
  } = useQuery({ queryKey: ["leaveRequests"], queryFn: getLeaveRequests });
  const stats = useEmployeeStats(employeeId);

  const [form, setForm] = useState({ leaveType: "", startDate: "", endDate: "", reason: "" });
  const records = Array.isArray(raw) ? raw.filter((l) => l.employeeId === employeeId) : [];

  const mutation = useMutation({
    mutationFn: applyLeave,
    meta: { inlineErrors: true, success: "Leave request sent" },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leaveRequests"] });
      setForm({ leaveType: "", startDate: "", endDate: "", reason: "" });
    },
  });

  const totalDays = days(form.startDate, form.endDate);

  function submit() {
    if (!employeeCode) return;
    mutation.mutate({
      employeeCode,
      leaveType: form.leaveType,
      startDate: form.startDate,
      endDate: form.endDate,
      totalDays,
      reason: form.reason,
    });
  }

  const setField = (key: keyof typeof form) => (value: string) =>
    setForm((p) => ({ ...p, [key]: value }));

  return (
    <div className="space-y-5">
      <PageHeader
        icon={CalendarDays}
        title="My leaves"
        description="Apply for leave and track approval status."
      />

      {/* Leave balance summary */}
      <div className="metric-strip grid grid-cols-2 sm:grid-cols-4">
        <StatCard label="Total leaves" value={stats.leaves.entitlement} icon={CalendarDays} />
        <StatCard label="Taken" value={stats.leaves.taken} icon={CalendarClock} tone="accent" />
        <StatCard
          label="Remaining"
          value={stats.leaves.remaining}
          icon={CalendarCheck}
          tone="success"
        />
        <StatCard label="Pending" value={stats.leaves.pending} icon={Hourglass} tone="warning" />
      </div>

      {/* Per-type breakdown */}
      {stats.leaves.byType.length > 0 && (
        <div className="overflow-hidden rounded-2xl border bg-card sm:grid sm:grid-cols-3">
          {stats.leaves.byType.map((t) => (
            <div
              key={t.type}
              className="flex items-center justify-between gap-3 border-b border-divider px-5 py-3 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"
            >
              <span className="text-[13px] font-medium">{t.type}</span>
              <span className="font-mono text-xs text-muted-foreground">
                <span className="text-[13px] font-medium text-foreground">{t.remaining}</span> left
                · {t.taken}/{t.quota} used
              </span>
            </div>
          ))}
        </div>
      )}

      <ChartCard
        title="Apply leave"
        description="Requests go to your admin for approval"
        icon={CalendarPlus}
        tone="violet"
        bodyClassName=""
      >
        {mutation.error && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2 rounded-lg border border-danger-line bg-danger-tint px-3 py-2.5 text-[13px] text-danger-ink"
          >
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            {mutation.error instanceof Error ? mutation.error.message : "Could not submit leave."}
          </div>
        )}
        <div className="grid gap-x-3 gap-y-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="leave-type">Type</Label>
            <Select value={form.leaveType} onValueChange={setField("leaveType")}>
              <SelectTrigger id="leave-type">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Annual">Annual</SelectItem>
                <SelectItem value="Casual">Casual</SelectItem>
                <SelectItem value="Sick">Sick</SelectItem>
                <SelectItem value="Unpaid">Unpaid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="leave-days">Total days</Label>
            <Input
              id="leave-days"
              className="bg-subtle font-mono"
              value={Math.max(totalDays, 0)}
              readOnly
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="leave-start">Start date</Label>
            <Input
              id="leave-start"
              type="date"
              className="font-mono"
              value={form.startDate}
              onChange={(e) => setField("startDate")(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="leave-end">End date</Label>
            <Input
              id="leave-end"
              type="date"
              className="font-mono"
              value={form.endDate}
              onChange={(e) => setField("endDate")(e.target.value)}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="leave-reason">Reason</Label>
            <Textarea
              id="leave-reason"
              value={form.reason}
              onChange={(e) => setField("reason")(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-5 flex justify-end pb-1">
          <Button
            className="w-full sm:w-auto max-sm:h-11"
            disabled={mutation.isPending || !form.leaveType || totalDays <= 0}
            onClick={submit}
          >
            {mutation.isPending ? "Submitting..." : "Submit Leave"}
          </Button>
        </div>
      </ChartCard>

      <div className="-mb-2 flex items-center gap-1.5">
        <History className="size-3.5 text-muted-foreground" />
        <h3 className="text-sm font-semibold tracking-[-0.2px]">My requests</h3>
      </div>
      <div>
        <DataTable<LeaveRequest>
          rowKey={(r) => r.leaveId}
          data={records}
          loading={isLoading}
          error={loadError}
          empty="No leave requests yet."
          columns={[
            {
              key: "leaveType",
              header: "Type",
              render: (r) => <span className="font-medium">{r.leaveType}</span>,
            },
            {
              key: "startDate",
              header: "Start",
              render: (r) => <span className="font-mono text-[13px]">{r.startDate}</span>,
            },
            {
              key: "endDate",
              header: "End",
              render: (r) => <span className="font-mono text-[13px]">{r.endDate}</span>,
            },
            {
              key: "totalDays",
              header: "Days",
              render: (r) => (
                <span className="font-mono text-[13px] font-medium">
                  {Number(r.totalDays || 0)}
                </span>
              ),
            },
            {
              key: "paidDays",
              header: "Paid",
              render: (r) => (
                <span className="font-mono text-[13px]">{Number(r.paidDays || 0)}</span>
              ),
            },
            {
              key: "unpaidDays",
              header: "Unpaid",
              render: (r) => (
                <span className="font-mono text-[13px]">{Number(r.unpaidDays || 0)}</span>
              ),
            },
            { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
          ]}
        />
      </div>
    </div>
  );
}
