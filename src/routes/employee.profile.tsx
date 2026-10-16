import { createFileRoute } from "@tanstack/react-router";
import { BriefcaseBusiness, User } from "lucide-react";
import { useEmployees } from "@/hooks/useEmployees";
import { useAuth } from "@/lib/auth/AuthContext";
import { PageHeader } from "@/components/shared/PageHeader";
import { ChartCard } from "@/components/shared/ChartCard";
import { StatusBadge } from "@/components/shared/StatusBadge";

export const Route = createFileRoute("/employee/profile")({
  head: () => ({ meta: [{ title: "My Profile — LDS HRMS" }] }),
  component: EmployeeProfile,
});

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words text-sm font-medium">{children || "—"}</dd>
    </div>
  );
}

function EmployeeProfile() {
  const { employeeId } = useAuth();
  const { data: raw = [] } = useEmployees();
  const employees = Array.isArray(raw) ? raw : [];
  const emp = employees.find((e) => e.employeeId === employeeId);

  return (
    <div className="space-y-5">
      <PageHeader icon={User} title="My profile" description="Personal and employment details." />

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Personal" icon={User} bodyClassName="">
          <dl className="grid gap-4 pb-1 sm:grid-cols-2">
            <Field label="Name">{emp?.name}</Field>
            <Field label="Email">{emp?.email}</Field>
            <Field label="Phone">
              {emp?.phone && <span className="font-mono">{emp.phone}</span>}
            </Field>
            <Field label="Address">{emp?.address}</Field>
          </dl>
        </ChartCard>

        <ChartCard title="Employment" icon={BriefcaseBusiness} tone="violet" bodyClassName="">
          <dl className="grid gap-4 pb-1 sm:grid-cols-2">
            <Field label="Employee code">
              {emp?.employeeCode && (
                <span className="font-mono text-muted-foreground">{emp.employeeCode}</span>
              )}
            </Field>
            <Field label="Status">{emp?.status && <StatusBadge status={emp.status} />}</Field>
            <Field label="Department">{emp?.department}</Field>
            <Field label="Designation">{emp?.designation}</Field>
          </dl>
        </ChartCard>
      </div>
    </div>
  );
}
