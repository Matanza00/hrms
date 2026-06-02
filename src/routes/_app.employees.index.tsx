import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { employees, type Employee } from "@/lib/mock-data";
import { Filter, Plus, Search, MoreHorizontal, Mail, Phone } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_app/employees/")({
  head: () => ({ meta: [{ title: "Employees — Nexus HRMS" }] }),
  component: EmployeesList,
});

function EmployeesList() {
  const [q, setQ] = useState("");
  const filtered = employees.filter((e) =>
    [e.name, e.code, e.email, e.department, e.designation].join(" ").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div>
      <PageHeader
        title="Employees"
        description="Manage your workforce, roles and employment records."
        actions={
          <Button size="sm" asChild><Link to="/employees/create"><Plus className="mr-1.5 h-3.5 w-3.5" />New employee</Link></Button>
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, code, department…" className="h-10 pl-9" />
        </div>
        <Button variant="outline" size="sm"><Filter className="mr-1.5 h-3.5 w-3.5" />Filters</Button>
      </div>

      <DataTable<Employee>
        rowKey={(r) => r.id}
        data={filtered}
        columns={[
          { key: "code", header: "Code", render: (r) => <span className="font-mono text-xs text-muted-foreground">{r.code}</span> },
          { key: "name", header: "Employee", render: (r) => (
            <Link to="/employees/$id" params={{ id: r.id }} className="flex items-center gap-3 group">
              <Avatar className="h-9 w-9"><AvatarFallback className="text-[11px] bg-muted">{r.name.split(" ").map((s) => s[0]).join("")}</AvatarFallback></Avatar>
              <div>
                <p className="font-medium group-hover:text-accent">{r.name}</p>
                <p className="text-xs text-muted-foreground">{r.designation}</p>
              </div>
            </Link>
          )},
          { key: "department", header: "Department" },
          { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
          { key: "phone", header: "Contact", render: (r) => (
            <div className="space-y-1">
              <p className="flex items-center gap-1.5 text-xs"><Phone className="h-3 w-3 text-muted-foreground" />{r.phone}</p>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Mail className="h-3 w-3" />{r.email}</p>
            </div>
          )},
          { key: "actions", header: "", className: "w-10 text-right", render: () => (
            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
          )},
        ]}
      />

      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>Showing {filtered.length} of {employees.length} employees</span>
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm">Previous</Button>
          <Button variant="outline" size="sm">Next</Button>
        </div>
      </div>
    </div>
  );
}
