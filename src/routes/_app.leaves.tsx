import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { leaveRequests, type LeaveRequest } from "@/lib/mock-data";
import { CalendarDays, CalendarCheck, CalendarX, CalendarClock, Plus } from "lucide-react";

export const Route = createFileRoute("/_app/leaves")({
  component: LeavesLayout,
});

function LeavesLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isRoot = path === "/leaves";
  return (
    <div>
      <PageHeader
        title="Leave management"
        description="Track balances, requests and approvals."
        actions={<Button size="sm" asChild><Link to="/leaves/request"><Plus className="mr-1.5 h-3.5 w-3.5" />Request leave</Link></Button>}
      />
      {isRoot ? <LeavesOverview /> : <Outlet />}
    </div>
  );
}

function LeavesOverview() {
  return (
    <>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Annual Balance" value="14" icon={CalendarDays} tone="accent" />
        <StatCard label="Casual Balance" value="7" icon={CalendarDays} tone="accent" />
        <StatCard label="Sick Balance" value="10" icon={CalendarDays} tone="accent" />
        <StatCard label="Pending" value="7" icon={CalendarClock} tone="warning" />
        <StatCard label="Approved" value="32" icon={CalendarCheck} tone="success" />
        <StatCard label="Rejected" value="4" icon={CalendarX} tone="danger" />
      </div>
      <div className="mt-6">
        <DataTable<LeaveRequest>
          rowKey={(r) => r.id}
          data={leaveRequests}
          columns={[
            { key: "employeeName", header: "Employee", render: (r) => <span className="font-medium">{r.employeeName}</span> },
            { key: "type", header: "Type", render: (r) => <span className="capitalize">{r.type}</span> },
            { key: "startDate", header: "Start" },
            { key: "endDate", header: "End" },
            { key: "days", header: "Days", render: (r) => <span className="tabular-nums">{r.days}</span> },
            { key: "reason", header: "Reason", render: (r) => <span className="text-muted-foreground line-clamp-1">{r.reason}</span> },
            { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
            { key: "actions", header: "", className: "text-right", render: () => (
              <Button size="sm" variant="outline" className="h-7">Review</Button>
            )},
          ]}
        />
      </div>
    </>
  );
}
