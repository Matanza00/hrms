import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarPlus, Upload } from "lucide-react";
import { IconTile } from "@/components/shared/IconTile";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { applyLeave } from "@/lib/api/leaves";
import { useEmployees } from "@/hooks/useEmployees";

export const Route = createFileRoute("/_app/leaves/request")({
  head: () => ({ meta: [{ title: "Request Leave — LDS HRMS" }] }),
  component: LeaveRequestPage,
});

function calculateDays(startDate: string, endDate: string) {
  if (!startDate || !endDate) return 0;

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;

  const diff = end.getTime() - start.getTime();

  if (diff < 0) return 0;

  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
}

function LeaveRequestPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [form, setForm] = useState({
    employeeCode: "",
    leaveType: "",
    startDate: "",
    endDate: "",
    reason: "",
    notes: "",
  });

  const [error, setError] = useState("");
  const { data: employeesRaw = [] } = useEmployees();
  const employees = Array.isArray(employeesRaw) ? employeesRaw : [];

  const totalDays = calculateDays(form.startDate, form.endDate);

  const mutation = useMutation({
    mutationFn: applyLeave,
    meta: { inlineErrors: true },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leaveRequests"] });
      navigate({ to: "/leaves" });
    },
  });

  async function handleSubmit() {
    try {
      setError("");

      if (!form.employeeCode.trim()) {
        setError("Employee code is required.");
        return;
      }

      if (!form.leaveType) {
        setError("Leave type is required.");
        return;
      }

      if (!form.startDate || !form.endDate) {
        setError("Start date and end date are required.");
        return;
      }

      if (totalDays <= 0) {
        setError("End date must be after start date.");
        return;
      }

      await mutation.mutateAsync({
        employeeCode: form.employeeCode.trim(),
        leaveType: form.leaveType,
        startDate: form.startDate,
        endDate: form.endDate,
        totalDays,
        reason: form.notes ? `${form.reason}\n\nAdmin Notes: ${form.notes}` : form.reason,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit leave.");
    }
  }

  return (
    <section className="max-w-3xl overflow-hidden rounded-xl border bg-card">
      <header className="flex items-center gap-2.5 border-b border-divider px-5 py-3.5">
        <IconTile icon={CalendarPlus} />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold leading-5 tracking-[-0.2px]">New leave request</h3>
          <p className="text-xs text-muted-foreground">Submit a request for approval by admin.</p>
        </div>
      </header>

      <div className="p-5">
        {error && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-danger-line bg-danger-tint px-4 py-3 text-[13px] text-danger-ink"
          >
            {error}
          </div>
        )}

        <div className="grid gap-x-3 gap-y-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Employee Code</Label>
            <Select
              value={form.employeeCode}
              onValueChange={(value) => setForm((p) => ({ ...p, employeeCode: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>

              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.employeeId} value={employee.employeeCode}>
                    {employee.name} — <span className="font-mono">{employee.employeeCode}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Leave type</Label>
            <Select
              value={form.leaveType}
              onValueChange={(value) => setForm((p) => ({ ...p, leaveType: value }))}
            >
              <SelectTrigger>
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
            <Label>Start date</Label>
            <Input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>End date</Label>
            <Input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border bg-subtle px-4 py-3 text-[13px] sm:col-span-2">
            <span className="font-medium text-muted-foreground">Total days</span>
            <span className="font-mono text-sm font-medium">{totalDays}</span>
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label>Reason</Label>
            <Textarea
              rows={3}
              placeholder="Briefly explain your reason…"
              value={form.reason}
              onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
            />
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label>Attachment</Label>
            <div className="flex flex-col items-center gap-2.5 rounded-lg border border-dashed px-6 py-6 text-center">
              <IconTile icon={Upload} tone="neutral" size="md" />
              <p className="text-[13px] text-muted-foreground">
                Attachment upload will be connected later.
              </p>
            </div>
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label>Notes for admin</Label>
            <Textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-divider px-5 py-3.5">
        <Button variant="outline" asChild>
          <Link to="/leaves">Cancel</Link>
        </Button>

        <Button onClick={handleSubmit} disabled={mutation.isPending}>
          {mutation.isPending ? "Submitting..." : "Submit request"}
        </Button>
      </div>
    </section>
  );
}
