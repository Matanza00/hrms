import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  Pencil,
  FileText,
  BadgeCheck,
} from "lucide-react";
import { useEmployee } from "@/hooks/useEmployees";

export const Route = createFileRoute("/_app/employees/$id/")({
  component: EmployeeProfile,
});

function formatPKR(value: number | string | undefined) {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value?: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

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

function Field({
  label,
  value,
}: {
  label: string;
  value?: string | number;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium">{value || "—"}</p>
    </div>
  );
}

function EmployeeProfile() {
  const { id } = useParams({ from: "/_app/employees/$id/" });

  const { data: emp, isLoading, error } = useEmployee(id);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading employee...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-500">{error instanceof Error ? error.message : "Something went wrong"}</p>;
  }

  if (!emp) {
    return <p className="text-sm text-muted-foreground">Employee not found.</p>;
  }

  const basicSalary = Number(emp.basicSalary || 0);
  const fuelAllowance = Number(emp.fuelAllowance || 0);
  const opdAllowance = Number(emp.opdAllowance || 0);
  const grossSalary = basicSalary + fuelAllowance + opdAllowance;

  return (
    <div>
      <PageHeader
        eyebrow="Employees"
        title={emp.name}
        description={`${emp.designation || "—"} · ${emp.department || "—"}`}
        actions={
          <Button size="sm" asChild>
            <Link to="/employees/$id/edit" params={{ id: emp.employeeId }}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Edit
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-2xl border bg-card p-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="text-lg bg-primary text-primary-foreground">
                  {initials(emp.name)}
                </AvatarFallback>
              </Avatar>

              <h3 className="mt-3 text-base font-semibold">{emp.name}</h3>
              <p className="text-xs text-muted-foreground">
                {emp.employeeCode}
              </p>

              <div className="mt-2">
                <StatusBadge status={emp.status} />
              </div>
            </div>

            <div className="mt-6 space-y-2.5 text-sm">
              <p className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                {emp.email || "—"}
              </p>

              <p className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-3.5 w-3.5" />
                {emp.phone || "—"}
              </p>

              <p className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {emp.address || "—"}
              </p>

              <p className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                Joined {formatDate(emp.joiningDate)}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-6">
            <h4 className="text-sm font-semibold mb-3">Salary breakdown</h4>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Basic</span>
                <span className="font-medium tabular-nums">
                  {formatPKR(basicSalary)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Fuel</span>
                <span className="font-medium tabular-nums">
                  {formatPKR(fuelAllowance)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">OPD</span>
                <span className="font-medium tabular-nums">
                  {formatPKR(opdAllowance)}
                </span>
              </div>

              <div className="flex justify-between border-t pt-2 mt-2">
                <span className="font-medium">Gross</span>
                <span className="font-semibold tabular-nums">
                  {formatPKR(grossSalary)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <Tabs defaultValue="personal">
            <TabsList>
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="employment">Employment</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="attendance">Attendance</TabsTrigger>
              <TabsTrigger value="leaves">Leaves</TabsTrigger>
              <TabsTrigger value="payroll">Payroll</TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="mt-4">
              <div className="rounded-2xl border bg-card p-6 grid gap-5 sm:grid-cols-2">
                <Field label="Full Name" value={emp.name} />
                <Field label="CNIC" value={emp.cnic} />
                <Field label="Date of Birth" value={formatDate(emp.dob)} />
                <Field label="Phone" value={emp.phone} />
                <Field label="Email" value={emp.email} />
                <Field label="Emergency Contact" value={emp.emergencyContact} />
                <Field label="Address" value={emp.address} />
              </div>
            </TabsContent>

            <TabsContent value="employment" className="mt-4">
              <div className="rounded-2xl border bg-card p-6 grid gap-5 sm:grid-cols-2">
                <Field label="Employee Code" value={emp.employeeCode} />
                <Field label="Department" value={emp.department} />
                <Field label="Designation" value={emp.designation} />
                <Field label="Status" value={emp.status} />
                <Field label="Joining Date" value={formatDate(emp.joiningDate)} />
                <Field
                  label="Permanent Date"
                  value={formatDate(emp.permanentDate)}
                />
                {!(emp.active === true || emp.active === "TRUE") && (
                  <Field label="End Date" value={formatDate(emp.endDate)} />
                )}
                <Field
                  label="Active"
                  value={
                    emp.active === true || emp.active === "TRUE"
                      ? "Yes"
                      : "No"
                  }
                />
              </div>
            </TabsContent>

            <TabsContent value="documents" className="mt-4">
              <div className="rounded-2xl border bg-card p-6">
                <div className="grid gap-3 sm:grid-cols-2">
                  {["CNIC", "Educational Certificates", "Medical Documents"].map(
                    (d) => (
                      <div
                        key={d}
                        className="flex items-center justify-between rounded-xl border p-3"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="grid h-9 w-9 place-items-center rounded-lg bg-muted">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{d}</p>
                            <p className="text-xs text-muted-foreground">
                              Google Drive upload pending
                            </p>
                          </div>
                        </div>
                        <BadgeCheck className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="attendance" className="mt-4">
              <div className="rounded-2xl border bg-card p-6 text-sm">
                <p className="text-muted-foreground">
                  Attendance records API will be connected next.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="leaves" className="mt-4">
              <div className="rounded-2xl border bg-card p-6 text-sm">
                <p className="text-muted-foreground">
                  Leave records API will be connected next.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="payroll" className="mt-4">
              <div className="rounded-2xl border bg-card p-6 text-sm">
                <p className="text-muted-foreground">
                  Payroll records API will be connected next.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}