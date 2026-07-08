import {
  createFileRoute,
  Link,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  CalendarCheck,
  CalendarX,
  CalendarClock,
  Plus,
  Check,
  X,
  Pencil,
} from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getLeaveRequests,
  type LeaveRequest,
} from "@/lib/api/leaves";
import { apiPost } from "@/lib/apiClient";
import { useEmployees } from "@/hooks/useEmployees";
import { LeaveEditDialog } from "@/components/leaves/LeaveEditDialog";
import type { Employee } from "@/lib/api/employees";

export const Route = createFileRoute("/_app/leaves")({
  component: LeavesLayout,
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

function LeavesLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isRoot = path === "/leaves";

  return (
    <div>
      <PageHeader
        title="Leave management"
        description="Track balances, requests and approvals."
        actions={
          <Button size="sm" asChild>
            <Link to="/leaves/request">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Request leave
            </Link>
          </Button>
        }
      />

      {isRoot ? <LeavesOverview /> : <Outlet />}
    </div>
  );
}

function LeavesOverview() {
  const qc = useQueryClient();

  const {
    data: leaveRequests = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["leaveRequests"],
    queryFn: getLeaveRequests,
  });

  const { data: employeesRaw = [] } = useEmployees();

  const employees: Employee[] = Array.isArray(employeesRaw)
    ? employeesRaw
    : [];

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LeaveRequest | null>(null);

  function openAdd() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(leave: LeaveRequest) {
    setEditing(leave);
    setDialogOpen(true);
  }

  function getEmployeeName(employeeId?: string) {
    const employee = employees.find(
      (e) => e.employeeId === employeeId
    );

    return employee?.name || employeeId || "Unknown";
  }

  const approveMutation = useMutation({
    mutationFn: (leaveId: string) =>
      apiPost("approveLeave", {
        leaveId,
        approvedBy: "Admin",
        comments: "Approved from frontend",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leaveRequests"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (leaveId: string) =>
      apiPost("rejectLeave", {
        leaveId,
        approvedBy: "Admin",
        comments: "Rejected from frontend",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leaveRequests"] });
    },
  });

  if (isLoading) {
    return (
      <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
        Loading leave requests...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error instanceof Error ? error.message : "Something went wrong"}
      </div>
    );
  }

  const pending = leaveRequests.filter((l) => l.status === "Pending").length;
  const approved = leaveRequests.filter((l) => l.status === "Approved").length;
  const rejected = leaveRequests.filter((l) => l.status === "Rejected").length;

  const paidDays = leaveRequests
    .filter((l) => l.status === "Approved")
    .reduce((sum, l) => sum + Number(l.paidDays || 0), 0);

  const unpaidDays = leaveRequests
    .filter((l) => l.status === "Approved")
    .reduce((sum, l) => sum + Number(l.unpaidDays || 0), 0);

  const totalRequestedDays = leaveRequests.reduce(
    (sum, l) => sum + Number(l.totalDays || 0),
    0
  );

  return (
    <>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Requested Days"
          value={totalRequestedDays}
          icon={CalendarDays}
          tone="accent"
        />

        <StatCard
          label="Paid Days"
          value={paidDays}
          icon={CalendarDays}
          tone="success"
        />

        <StatCard
          label="Unpaid Days"
          value={unpaidDays}
          icon={CalendarDays}
          tone="warning"
        />

        <StatCard
          label="Pending"
          value={pending}
          icon={CalendarClock}
          tone="warning"
        />

        <StatCard
          label="Approved"
          value={approved}
          icon={CalendarCheck}
          tone="success"
        />

        <StatCard
          label="Rejected"
          value={rejected}
          icon={CalendarX}
          tone="danger"
        />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Leave records</h3>
        <Button size="sm" variant="outline" onClick={openAdd}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add old leave
        </Button>
      </div>

      <div className="mt-3">
        <DataTable<LeaveRequest>
          rowKey={(r) => r.leaveId}
          data={leaveRequests}
          columns={[
            {
              key: "employeeName",
              header: "Employee",
              render: (r) => (
                <span className="font-medium">
                  {r.employeeName || getEmployeeName(r.employeeId)}
                </span>
              ),
            },
            {
              key: "leaveType",
              header: "Type",
              render: (r) => (
                <span className="capitalize">{r.leaveType}</span>
              ),
            },
            {
              key: "startDate",
              header: "Start",
              render: (r) => formatDate(r.startDate),
            },
            {
              key: "endDate",
              header: "End",
              render: (r) => formatDate(r.endDate),
            },
            {
              key: "totalDays",
              header: "Days",
              render: (r) => (
                <span className="tabular-nums">
                  {Number(r.totalDays || 0)}
                </span>
              ),
            },
            {
              key: "paidDays",
              header: "Paid",
              render: (r) => (
                <span className="tabular-nums">
                  {Number(r.paidDays || 0)}
                </span>
              ),
            },
            {
              key: "unpaidDays",
              header: "Unpaid",
              render: (r) => (
                <span className="tabular-nums">
                  {Number(r.unpaidDays || 0)}
                </span>
              ),
            },
            {
              key: "reason",
              header: "Reason",
              render: (r) => (
                <span className="text-muted-foreground line-clamp-1">
                  {r.reason || "—"}
                </span>
              ),
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

                return (
                  <div className="flex justify-end gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7"
                      disabled={!isPending || approveMutation.isPending}
                      onClick={() => approveMutation.mutate(r.leaveId)}
                    >
                      <Check className="mr-1 h-3 w-3" />
                      Approve
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7"
                      disabled={!isPending || rejectMutation.isPending}
                      onClick={() => rejectMutation.mutate(r.leaveId)}
                    >
                      <X className="mr-1 h-3 w-3" />
                      Reject
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7"
                      onClick={() => openEdit(r)}
                    >
                      <Pencil className="mr-1 h-3 w-3" />
                      Edit
                    </Button>
                  </div>
                );
              },
            },
          ]}
        />
      </div>

      <LeaveEditDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        leave={editing}
        employees={employees}
      />
    </>
  );
}