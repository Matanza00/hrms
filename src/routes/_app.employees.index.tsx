import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useEmployees } from "@/hooks/useEmployees";
import { PasswordResetRequests } from "@/components/employees/PasswordResetRequests";
import { ResignationRequests } from "@/components/employees/Separations";
import { PendingDocuments } from "@/components/employees/PendingDocuments";
import type { Employee } from "@/lib/api/employees";
import { Filter, Plus, Users, Search, MoreHorizontal, Mail, Phone } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_app/employees/")({
  head: () => ({ meta: [{ title: "Employees — LDS HRMS" }] }),
  component: EmployeesList,
});

function initials(name?: string) {
  if (!name) return "NA";

  return name
    .split(" ")
    .filter(Boolean)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function isActive(value: Employee["active"]) {
  return value === true || value === "TRUE";
}

function EmployeesList() {
  const [q, setQ] = useState("");

  const { data: employees = [], isLoading, error } = useEmployees();

  const filtered = employees.filter((e) =>
    [e.name, e.employeeCode, e.email, e.department, e.designation, e.status]
      .join(" ")
      .toLowerCase()
      .includes(q.toLowerCase()),
  );

  if (isLoading) {
    return (
      <div>
        <PageHeader
          icon={Users}
          title="Employees"
          description="Manage your workforce, roles and employment records."
        />
        <div className="rounded-xl border bg-card p-5 text-[13px] text-muted-foreground">
          Loading employees...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader
          icon={Users}
          title="Employees"
          description="Manage your workforce, roles and employment records."
        />
        <div
          role="alert"
          className="rounded-xl border border-danger-line bg-danger-tint p-5 text-[13px] text-danger-ink"
        >
          {error instanceof Error ? error.message : "Something went wrong"}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        icon={Users}
        title="Employees"
        description="Manage your workforce, roles and employment records."
        actions={
          <Button asChild>
            <Link to="/employees/create">
              <Plus />
              New employee
            </Link>
          </Button>
        }
      />

      <PasswordResetRequests />
      <ResignationRequests />
      <PendingDocuments />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, code, department…"
            className="h-10 pl-9"
          />
        </div>

        <Button variant="outline" className="self-start sm:self-auto">
          <Filter />
          Filters
        </Button>
      </div>

      <DataTable<Employee>
        rowKey={(r) => r.employeeId}
        data={filtered}
        columns={[
          // Name first: on phones the first column heads each card.
          {
            key: "name",
            header: "Employee",
            render: (r) => (
              <Link
                to="/employees/$id"
                params={{ id: r.employeeId }}
                className="group flex min-w-0 max-w-64 items-center gap-3"
              >
                <Avatar className="size-9">
                  <AvatarFallback className="bg-muted text-[11px] text-text-secondary">
                    {initials(r.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground group-hover:underline">
                    {r.name || "Unnamed"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{r.designation || "—"}</p>
                </div>
              </Link>
            ),
          },
          {
            key: "employeeCode",
            header: "Code",
            render: (r) => (
              <span className="font-mono text-sm text-muted-foreground">{r.employeeCode}</span>
            ),
          },
          {
            key: "department",
            header: "Department",
            render: (r) => r.department || "—",
          },
          {
            key: "status",
            header: "Status",
            render: (r) => <StatusBadge status={r.status} />,
          },
          {
            key: "active",
            header: "Active",
            render: (r) => <StatusBadge status={isActive(r.active) ? "Active" : "Inactive"} />,
          },
          {
            key: "phone",
            header: "Contact",
            render: (r) => (
              <div className="space-y-1">
                <p className="flex items-center gap-1.5 text-xs text-foreground sm:justify-start">
                  <Phone className="size-3 shrink-0 text-muted-foreground" />
                  {r.phone || "—"}
                </p>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground sm:justify-start">
                  <Mail className="size-3 shrink-0" />
                  <span className="min-w-0 [overflow-wrap:anywhere]">{r.email || "—"}</span>
                </p>
              </div>
            ),
          },
          {
            key: "actions",
            header: "",
            className: "w-10 text-right",
            render: (r) => (
              <Button variant="ghost" size="icon" asChild>
                <Link
                  to="/employees/$id"
                  params={{ id: r.employeeId }}
                  aria-label={`Open ${r.name || "employee"}`}
                >
                  <MoreHorizontal />
                </Link>
              </Button>
            ),
          },
        ]}
      />

      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Showing {filtered.length} of {employees.length} employees
        </span>

        <div className="flex gap-1.5">
          <Button variant="outline" disabled>
            Previous
          </Button>
          <Button variant="outline" disabled>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
