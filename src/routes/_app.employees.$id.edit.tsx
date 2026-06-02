import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { employees } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/employees/$id/edit")({
  component: EditEmployee,
});

function EditEmployee() {
  const { id } = useParams({ from: "/_app/employees/$id/edit" });
  const emp = employees.find((e) => e.id === id) ?? employees[0];
  return (
    <div>
      <PageHeader
        eyebrow="Employees"
        title={`Edit ${emp.name}`}
        actions={<><Button variant="outline" size="sm" asChild><Link to="/employees/$id" params={{ id }}>Cancel</Link></Button><Button size="sm">Save</Button></>}
      />
      <div className="rounded-2xl border bg-card p-6 max-w-3xl grid gap-4 sm:grid-cols-2">
        <div><Label className="text-xs">Name</Label><Input defaultValue={emp.name} className="mt-1.5" /></div>
        <div><Label className="text-xs">Email</Label><Input defaultValue={emp.email} className="mt-1.5" /></div>
        <div><Label className="text-xs">Phone</Label><Input defaultValue={emp.phone} className="mt-1.5" /></div>
        <div><Label className="text-xs">Designation</Label><Input defaultValue={emp.designation} className="mt-1.5" /></div>
        <div><Label className="text-xs">Department</Label><Input defaultValue={emp.department} className="mt-1.5" /></div>
        <div><Label className="text-xs">Basic Salary</Label><Input type="number" defaultValue={emp.basicSalary} className="mt-1.5" /></div>
      </div>
    </div>
  );
}
