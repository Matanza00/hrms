import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2,
  Calendar,
  CalendarDays,
  Clock,
  FileText,
  Info,
  Mail,
  MapPin,
  Pencil,
  Phone,
  User,
  Users,
  Wallet,
} from "lucide-react";
import { ChartCard } from "@/components/shared/ChartCard";
import { IconTile } from "@/components/shared/IconTile";
import { cn } from "@/lib/utils";
import { useEmployee } from "@/hooks/useEmployees";

export const Route = createFileRoute("/_app/employees/$id/")({
  head: () => ({ meta: [{ title: "Employee — LDS HRMS" }] }),
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

function Field({ label, value, mono }: { label: string; value?: string | number; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[13px] font-medium leading-[18px] text-muted-foreground">{label}</p>
      <p className={cn("mt-1.5 break-words text-sm text-foreground", mono && "font-mono")}>
        {value || "—"}
      </p>
    </div>
  );
}

function Pending({ children }: { children: string }) {
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Info className="size-3.5 shrink-0" />
      {children}
    </p>
  );
}

function EmployeeProfile() {
  const { id } = useParams({ from: "/_app/employees/$id/" });

  const { data: emp, isLoading, error } = useEmployee(id);

  if (isLoading) {
    return <p className="text-[13px] text-muted-foreground">Loading employee...</p>;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-danger-line bg-danger-tint px-4 py-3 text-[13px] text-danger-ink">
        {error instanceof Error ? error.message : "Something went wrong"}
      </div>
    );
  }

  if (!emp) {
    return <p className="text-[13px] text-muted-foreground">Employee not found.</p>;
  }

  const basicSalary = Number(emp.basicSalary || 0);
  const fuelAllowance = Number(emp.fuelAllowance || 0);
  const opdAllowance = Number(emp.opdAllowance || 0);
  const grossSalary = basicSalary + fuelAllowance + opdAllowance;
  const isActive = emp.active === true || emp.active === "TRUE";

  return (
    <div>
      <PageHeader
        icon={Users}
        eyebrow="Employees"
        title={emp.name}
        description={`${emp.designation || "—"} · ${emp.department || "—"}`}
        actions={
          <Button asChild>
            <Link to="/employees/$id/edit" params={{ id: emp.employeeId }}>
              <Pencil />
              Edit
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <div className="overflow-hidden rounded-xl border bg-card">
            <div className="flex items-center gap-4 border-b border-divider p-5">
              <Avatar className="size-14">
                <AvatarFallback className="bg-foreground text-lg text-background">
                  {initials(emp.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold leading-6">{emp.name}</h3>
                <p className="font-mono text-[13px] text-muted-foreground">{emp.employeeCode}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <StatusBadge status={emp.status} />
                  <StatusBadge status={isActive ? "Active" : "Inactive"} />
                </div>
              </div>
            </div>

            <div className="space-y-2.5 p-5 text-[13px] text-text-secondary">
              <p className="flex items-center gap-2 break-all">
                <Mail className="size-3.5 shrink-0 text-muted-foreground" />
                {emp.email || "—"}
              </p>
              <p className="flex items-center gap-2">
                <Phone className="size-3.5 shrink-0 text-muted-foreground" />
                {emp.phone || "—"}
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
                {emp.address || "—"}
              </p>
              <p className="flex items-center gap-2">
                <Calendar className="size-3.5 shrink-0 text-muted-foreground" />
                Joined {formatDate(emp.joiningDate)}
              </p>
            </div>
          </div>

          <ChartCard title="Salary breakdown" icon={Wallet} tone="success" bodyClassName="">
            <div className="space-y-2.5 text-[13px]">
              {[
                ["Basic", basicSalary],
                ["Fuel", fuelAllowance],
                ["OPD", opdAllowance],
              ].map(([label, amount]) => (
                <div key={label} className="flex justify-between gap-3">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-mono font-medium">{formatPKR(amount)}</span>
                </div>
              ))}
              <div className="mt-1 flex justify-between gap-3 border-t border-divider pt-3">
                <span className="font-medium">Gross</span>
                <span className="font-mono font-semibold">{formatPKR(grossSalary)}</span>
              </div>
            </div>
          </ChartCard>
        </div>

        <div className="min-w-0 lg:col-span-2">
          <Tabs defaultValue="personal">
            <div className="-mx-1 overflow-x-auto px-1">
              <TabsList>
                <TabsTrigger value="personal">Personal</TabsTrigger>
                <TabsTrigger value="employment">Employment</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="attendance">Attendance</TabsTrigger>
                <TabsTrigger value="leaves">Leaves</TabsTrigger>
                <TabsTrigger value="payroll">Payroll</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="personal" className="mt-4">
              <ChartCard title="Personal" icon={User} bodyClassName="">
                <div className="grid gap-x-3 gap-y-4 sm:grid-cols-2">
                  <Field label="Full name" value={emp.name} />
                  <Field label="CNIC" value={emp.cnic} mono />
                  <Field label="Date of birth" value={formatDate(emp.dob)} />
                  <Field label="Phone" value={emp.phone} />
                  <Field label="Email" value={emp.email} />
                  <Field label="Emergency contact" value={emp.emergencyContact} />
                  <Field label="Address" value={emp.address} />
                </div>
              </ChartCard>
            </TabsContent>

            <TabsContent value="employment" className="mt-4">
              <ChartCard title="Employment" icon={Building2} tone="violet" bodyClassName="">
                <div className="grid gap-x-3 gap-y-4 sm:grid-cols-2">
                  <Field label="Employee code" value={emp.employeeCode} mono />
                  <Field label="Department" value={emp.department} />
                  <Field label="Designation" value={emp.designation} />
                  <Field label="Status" value={emp.status} />
                  <Field label="Joining date" value={formatDate(emp.joiningDate)} />
                  <Field label="Permanent date" value={formatDate(emp.permanentDate)} />
                  {!isActive && (
                    <Field label="End date" value={formatDate(emp.endDate ?? undefined)} />
                  )}
                  <Field label="Active" value={isActive ? "Yes" : "No"} />
                </div>
              </ChartCard>
            </TabsContent>

            <TabsContent value="documents" className="mt-4">
              <ChartCard
                title="Documents"
                description="Google Drive upload will be connected later."
                icon={FileText}
                tone="warning"
                bodyClassName=""
              >
                <div className="-mx-5 -mb-4 -mt-5">
                  {["CNIC", "Educational Certificates", "Medical Documents"].map((d) => (
                    <div
                      key={d}
                      className="flex items-center justify-between gap-3 border-b border-divider px-5 py-3 last:border-0"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <IconTile icon={FileText} tone="neutral" size="md" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{d}</p>
                          <p className="text-xs text-muted-foreground">
                            Google Drive upload pending
                          </p>
                        </div>
                      </div>
                      <StatusBadge status="pending" />
                    </div>
                  ))}
                </div>
              </ChartCard>
            </TabsContent>

            <TabsContent value="attendance" className="mt-4">
              <ChartCard title="Attendance" icon={Clock} tone="warning" bodyClassName="">
                <Pending>Attendance records API will be connected next.</Pending>
              </ChartCard>
            </TabsContent>

            <TabsContent value="leaves" className="mt-4">
              <ChartCard title="Leaves" icon={CalendarDays} bodyClassName="">
                <Pending>Leave records API will be connected next.</Pending>
              </ChartCard>
            </TabsContent>

            <TabsContent value="payroll" className="mt-4">
              <ChartCard title="Payroll" icon={Wallet} tone="success" bodyClassName="">
                <Pending>Payroll records API will be connected next.</Pending>
              </ChartCard>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
