import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { CalendarDays, Check, CircleCheck, Clock, Pencil, Plus, Wallet, X } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getLeaveRequests, type LeaveRequest } from "@/lib/api/leaves";
import { apiPost } from "@/lib/apiClient";
import { useEmployees } from "@/hooks/useEmployees";
import { LeaveEditDialog } from "@/components/leaves/LeaveEditDialog";
import type { Employee } from "@/lib/api/employees";

export const Route = createFileRoute("/_app/leaves")({
  head: () => ({ meta: [{ title: "Leaves — LDS HRMS" }] }),
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
        icon={CalendarDays}
        title="Leave management"
        description="Track balances, requests and approvals."
        actions={
          isRoot && (
            <Button asChild>
              <Link to="/leaves/request">
                <Plus />
                Request leave
              </Link>
            </Button>
          )
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

  const employees: Employee[] = Array.isArray(employeesRaw) ? employeesRaw : [];

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
    const employee = employees.find((e) => e.employeeId === employeeId);

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
      <div className="rounded-xl border bg-card p-5 text-[13px] text-muted-foreground">
        Loading leave requests...
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="rounded-xl border border-danger-line bg-danger-tint p-5 text-[13px] text-danger-ink">
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

  const totalRequestedDays = leaveRequests.reduce((sum, l) => sum + Number(l.totalDays || 0), 0);

  return (
    <>
      <div className="metric-strip grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Requested Days"
          value={totalRequestedDays}
          icon={CalendarDays}
          tone="accent"
        />

        <StatCard label="Paid Days" value={paidDays} icon={CircleCheck} tone="success" />

        <StatCard label="Unpaid Days" value={unpaidDays} icon={Wallet} tone="warning" />

        <StatCard label="Pending" value={pending} icon={Clock} tone="warning" />

        <StatCard label="Approved" value={approved} icon={Check} tone="success" />

        <StatCard label="Rejected" value={rejected} icon={X} tone="danger" />
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold leading-5 tracking-[-0.2px]">Leave records</h3>
        <Button variant="outline" onClick={openAdd}>
          <Plus />
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
                <span className="font-medium text-foreground">
                  {r.employeeName || getEmployeeName(r.employeeId)}
                </span>
              ),
            },
            {
              key: "leaveType",
              header: "Type",
              render: (r) => <span className="capitalize">{r.leaveType}</span>,
            },
            {
              key: "startDate",
              header: "Start",
              className: "whitespace-nowrap",
              render: (r) => formatDate(r.startDate),
            },
            {
              key: "endDate",
              header: "End",
              className: "whitespace-nowrap",
              render: (r) => formatDate(r.endDate),
            },
            {
              key: "totalDays",
              header: "Days",
              render: (r) => <span className="font-mono">{Number(r.totalDays || 0)}</span>,
            },
            {
              key: "paidDays",
              header: "Paid",
              render: (r) => <span className="font-mono">{Number(r.paidDays || 0)}</span>,
            },
            {
              key: "unpaidDays",
              header: "Unpaid",
              render: (r) => (
                <span
                  className={
                    Number(r.unpaidDays || 0) ? "font-mono" : "font-mono text-muted-foreground"
                  }
                >
                  {Number(r.unpaidDays || 0)}
                </span>
              ),
            },
            {
              key: "reason",
              header: "Reason",
              render: (r) => (
                <span className="text-muted-foreground line-clamp-1">{r.reason || "—"}</span>
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
                    {isPending && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={approveMutation.isPending}
                          onClick={() => approveMutation.mutate(r.leaveId)}
                        >
                          <Check className="text-success-ink" />
                          Approve
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          disabled={rejectMutation.isPending}
                          onClick={() => rejectMutation.mutate(r.leaveId)}
                        >
                          <X className="text-danger-ink" />
                          Reject
                        </Button>
                      </>
                    )}

                    <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                      <Pencil />
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
