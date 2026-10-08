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
import { UploadCloud } from "lucide-react";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { applyLeave } from "@/lib/api/leaves";
import { useEmployees } from "@/hooks/useEmployees";

export const Route = createFileRoute("/_app/leaves/request")({
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
        reason: form.notes
          ? `${form.reason}\n\nAdmin Notes: ${form.notes}`
          : form.reason,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit leave.");
    }
  }

  return (
    <div className="max-w-2xl rounded-2xl border bg-card shadow-xs p-6">
      <h3 className="text-base font-semibold">New leave request</h3>
      <p className="text-xs text-muted-foreground mb-5">
        Submit a request for approval by admin.
      </p>

      {error && (
        <div role="alert" className="mb-4 rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-[oklch(0.5_0.23_27)] dark:text-[oklch(0.78_0.23_27)]">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Employee Code</Label>
          <Select
            value={form.employeeCode}
            onValueChange={(value) =>
              setForm((p) => ({ ...p, employeeCode: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select employee" />
            </SelectTrigger>

            <SelectContent>
              {employees.map((employee) => (
                <SelectItem
                  key={employee.employeeId}
                  value={employee.employeeCode}
                >
                  {employee.name} — {employee.employeeCode}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Leave type</Label>
          <Select
            value={form.leaveType}
            onValueChange={(value) =>
              setForm((p) => ({ ...p, leaveType: value }))
            }
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
          <Label className="text-xs">Start date</Label>
          <Input
            type="date"
            value={form.startDate}
            onChange={(e) =>
              setForm((p) => ({ ...p, startDate: e.target.value }))
            }
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">End date</Label>
          <Input
            type="date"
            value={form.endDate}
            onChange={(e) =>
              setForm((p) => ({ ...p, endDate: e.target.value }))
            }
          />
        </div>

        <div className="sm:col-span-2 rounded-xl border bg-muted/40 px-4 py-3 text-sm">
          Total days: <span className="font-semibold">{totalDays}</span>
        </div>

        <div className="sm:col-span-2 space-y-1.5">
          <Label className="text-xs">Reason</Label>
          <Textarea
            rows={3}
            placeholder="Briefly explain your reason…"
            value={form.reason}
            onChange={(e) =>
              setForm((p) => ({ ...p, reason: e.target.value }))
            }
          />
        </div>

        <div className="sm:col-span-2 space-y-1.5">
          <Label className="text-xs">Attachment</Label>
          <div className="rounded-xl border-2 border-dashed p-6 text-center opacity-70">
            <UploadCloud className="mx-auto h-5 w-5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground mt-2">
              Attachment upload will be connected later.
            </p>
          </div>
        </div>

        <div className="sm:col-span-2 space-y-1.5">
          <Label className="text-xs">Notes for admin</Label>
          <Textarea
            rows={2}
            value={form.notes}
            onChange={(e) =>
              setForm((p) => ({ ...p, notes: e.target.value }))
            }
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-5">
        <Button variant="outline" asChild>
          <Link to="/leaves">Cancel</Link>
        </Button>

        <Button onClick={handleSubmit} disabled={mutation.isPending}>
          {mutation.isPending ? "Submitting..." : "Submit request"}
        </Button>
      </div>
    </div>
  );
}