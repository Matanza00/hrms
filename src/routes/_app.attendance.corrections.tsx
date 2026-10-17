import { createFileRoute } from "@tanstack/react-router";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  approveAttendanceCorrection,
  getAttendanceCorrections,
  type AttendanceCorrection,
} from "@/lib/api/attendance";
import { useEmployees } from "@/hooks/useEmployees";

export const Route = createFileRoute("/_app/attendance/corrections")({
  head: () => ({ meta: [{ title: "Attendance Corrections — LDS HRMS" }] }),
  component: Corrections,
});

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

function formatDateTime(value?: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Corrections() {
  const qc = useQueryClient();

  const { data: employeesRaw = [] } = useEmployees();

  const employees = Array.isArray(employeesRaw) ? employeesRaw : [];

  function getEmployeeName(employeeId?: string) {
    const employee = employees.find((e) => e.employeeId === employeeId);

    return employee?.name || employeeId || "Unknown";
  }

  const {
    data: corrections = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["attendanceCorrections"],
    queryFn: getAttendanceCorrections,
  });

  const approveMutation = useMutation({
    mutationFn: approveAttendanceCorrection,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendanceCorrections"] });
      qc.invalidateQueries({ queryKey: ["attendance"] });
    },
  });

  if (isLoading) {
    return (
      <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
        Loading correction requests...
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-danger-line bg-danger-tint p-4 text-[13px] text-danger-ink"
      >
        {error instanceof Error ? error.message : "Something went wrong"}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {approveMutation.error && (
        <div
          role="alert"
          className="rounded-lg border border-danger-line bg-danger-tint p-4 text-[13px] text-danger-ink"
        >
          {approveMutation.error instanceof Error
            ? approveMutation.error.message
            : "Could not approve the request."}
        </div>
      )}
      <DataTable<AttendanceCorrection>
        rowKey={(r) => r.correctionId}
        data={corrections}
        empty={
          <EmptyState
            title="No correction requests"
            description="Requests employees send to fix a check-in, break or check-out show up here."
          />
        }
        columns={[
          {
            key: "employee",
            header: "Employee",
            render: (r) => (
              <span className="font-medium">{r.employeeName || getEmployeeName(r.employeeId)}</span>
            ),
          },
          {
            key: "attendanceDate",
            header: "Date",
            render: (r) => (
              <span className="whitespace-nowrap">{formatDate(r.attendanceDate)}</span>
            ),
          },
          {
            key: "requestType",
            header: "Type",
            render: (r) => (
              <span className="font-mono text-sm text-muted-foreground">{r.requestType}</span>
            ),
          },
          {
            key: "oldValue",
            header: "Old",
            render: (r) => (
              <span className="break-all font-mono text-[13px] text-muted-foreground">
                {r.oldValue || "—"}
              </span>
            ),
          },
          {
            key: "newValue",
            header: "New",
            render: (r) => (
              <span className="break-all font-mono text-[13px] font-medium">
                {r.newValue || "—"}
              </span>
            ),
          },
          {
            key: "reason",
            header: "Reason",
            render: (r) => <span className="text-muted-foreground">{r.reason || "—"}</span>,
          },
          {
            key: "createdAt",
            header: "Requested",
            render: (r) => formatDateTime(r.createdAt),
          },
          {
            key: "status",
            header: "Status",
            render: (r) => <StatusBadge status={r.status} />,
          },
          {
            key: "actions",
            header: "",
            className: "text-right",
            render: (r) => {
              const isPending = r.status === "Pending";

              if (!isPending) {
                return (
                  <span className="whitespace-nowrap text-xs text-muted-foreground">
                    {r.approvedBy ? `${r.status} by ${r.approvedBy}` : "—"}
                  </span>
                );
              }

              return (
                <div className="flex justify-end gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={approveMutation.isPending}
                    onClick={() => approveMutation.mutate(r.correctionId)}
                  >
                    <Check />
                    Approve
                  </Button>

                  <Button size="sm" variant="outline" disabled>
                    <X />
                    Reject
                  </Button>
                </div>
              );
            },
          },
        ]}
      />
    </div>
  );
}
