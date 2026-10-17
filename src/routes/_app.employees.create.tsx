import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, FileText, Upload, User, UserPlus, Wallet, type LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { IconTile } from "@/components/shared/IconTile";
import type { Tone } from "@/lib/tones";
import { useCreateEmployee } from "@/hooks/useEmployees";

export const Route = createFileRoute("/_app/employees/create")({
  head: () => ({ meta: [{ title: "New Employee — LDS HRMS" }] }),
  component: EmployeeCreate,
});

/** Figma "Card" with a form body: icon-tile header row, then a two-column grid. */
function Section({
  title,
  children,
  description,
  icon,
  tone = "info",
}: {
  title: string;
  description?: ReactNode;
  icon: LucideIcon;
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <header className="flex items-center gap-2.5 border-b border-divider px-5 py-3.5">
        <IconTile icon={icon} tone={tone} />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold leading-5 tracking-[-0.2px]">{title}</h3>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </header>
      <div className="grid gap-x-3 gap-y-4 p-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function F({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required && <span className="ml-0.5 text-danger-ink">*</span>}
      </Label>
      {children}
    </div>
  );
}

type EmployeeForm = {
  employeeCode: string;
  name: string;
  email: string;
  phone: string;
  cnic: string;
  dob: string;
  emergencyContact: string;
  address: string;
  department: string;
  designation: string;
  status: "Permanent" | "Contract" | "Probation" | "Intern" | "Notice Period" | "Resigned";
  joiningDate: string;
  permanentDate: string;
  basicSalary: string;
  fuelAllowance: string;
  opdAllowance: string;
};

const initialForm: EmployeeForm = {
  employeeCode: "",
  name: "",
  email: "",
  phone: "",
  cnic: "",
  dob: "",
  emergencyContact: "",
  address: "",
  department: "",
  designation: "",
  status: "Probation",
  joiningDate: "",
  permanentDate: "",
  basicSalary: "",
  fuelAllowance: "",
  opdAllowance: "",
};

function EmployeeCreate() {
  const navigate = useNavigate();
  const createEmployee = useCreateEmployee();

  const [form, setForm] = useState<EmployeeForm>(initialForm);
  const [error, setError] = useState("");

  function updateField<K extends keyof EmployeeForm>(field: K, value: EmployeeForm[K]) {
    setError("");
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleSubmit() {
    try {
      if (!form.employeeCode.trim()) {
        setError("Employee code is required.");
        return;
      }

      // The code becomes their Login ID and, from that, the email address the
      // account is created under, so it cannot hold spaces.
      if (!/^[A-Za-z0-9._-]+$/.test(form.employeeCode.trim())) {
        setError(
          "Employee code can only contain letters, numbers, dots, dashes and underscores — no spaces. It becomes their Login ID.",
        );
        return;
      }

      if (!form.name.trim()) {
        setError("Full name is required.");
        return;
      }

      if (!form.email.trim()) {
        setError("Email is required.");
        return;
      }

      await createEmployee.mutateAsync({
        employeeCode: form.employeeCode.trim(),
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        cnic: form.cnic.trim(),
        dob: form.dob,
        joiningDate: form.joiningDate,
        permanentDate: form.permanentDate,
        status: form.status,
        department: form.department,
        designation: form.designation,
        basicSalary: Number(form.basicSalary || 0),
        fuelAllowance: form.status === "Permanent" ? Number(form.fuelAllowance || 0) : 0,
        opdAllowance: form.status === "Permanent" ? Number(form.opdAllowance || 0) : 0,
        address: form.address,
        emergencyContact: form.emergencyContact,
      });

      navigate({ to: "/employees" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create employee.");
    }
  }

  return (
    <div>
      <PageHeader
        icon={UserPlus}
        title="Add new employee"
        description="Onboard a new team member with their personal, employment and salary details. Fields marked * are required."
      />

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-danger-line bg-danger-tint px-4 py-3 text-[13px] text-danger-ink"
        >
          {error}
        </div>
      )}

      <div className="space-y-5">
        <Section title="Personal information" icon={User}>
          <F label="Full name" required>
            <Input
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="John Doe"
            />
          </F>

          <F label="Email" required>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="john@LDS.co"
            />
          </F>

          <F label="Phone">
            <Input
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              placeholder="+92 300 0000000"
            />
          </F>

          <F label="CNIC">
            <Input
              value={form.cnic}
              onChange={(e) => updateField("cnic", e.target.value)}
              placeholder="00000-0000000-0"
            />
          </F>

          <F label="Date of birth">
            <Input
              type="date"
              value={form.dob}
              onChange={(e) => updateField("dob", e.target.value)}
            />
          </F>

          <F label="Emergency contact">
            <Input
              value={form.emergencyContact}
              onChange={(e) => updateField("emergencyContact", e.target.value)}
              placeholder="+92 300 0000000"
            />
          </F>

          <div className="sm:col-span-2">
            <F label="Address">
              <Textarea
                rows={2}
                value={form.address}
                onChange={(e) => updateField("address", e.target.value)}
              />
            </F>
          </div>
        </Section>

        <Section
          title="Employment information"
          icon={Building2}
          tone="violet"
          description={
            <>
              A login is created automatically: the Login ID is the employee code and the password
              is <span className="font-mono">admin12345</span>. The code cannot contain spaces.
            </>
          }
        >
          <F label="Employee code" required>
            <Input
              value={form.employeeCode}
              onChange={(e) => updateField("employeeCode", e.target.value)}
              placeholder="EMP001"
              className="font-mono"
            />
          </F>

          <F label="Department">
            <Select
              value={form.department}
              onValueChange={(value) => updateField("department", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {["Engineering", "Design", "Accounts", "HR", "Marketing", "Operations"].map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </F>

          <F label="Designation">
            <Input
              value={form.designation}
              onChange={(e) => updateField("designation", e.target.value)}
              placeholder="Senior Engineer"
            />
          </F>

          <F label="Status">
            <Select
              value={form.status}
              onValueChange={(value) => updateField("status", value as EmployeeForm["status"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Permanent">Permanent</SelectItem>
                <SelectItem value="Contract">Contract</SelectItem>
                <SelectItem value="Probation">Probation</SelectItem>
                <SelectItem value="Intern">Intern</SelectItem>
                <SelectItem value="Notice Period">Notice Period</SelectItem>
                <SelectItem value="Resigned">Resigned</SelectItem>
              </SelectContent>
            </Select>
          </F>

          <F label="Joining date">
            <Input
              type="date"
              value={form.joiningDate}
              onChange={(e) => updateField("joiningDate", e.target.value)}
            />
          </F>

          <F label="Permanent date">
            <Input
              type="date"
              value={form.permanentDate}
              onChange={(e) => updateField("permanentDate", e.target.value)}
            />
          </F>
        </Section>

        <Section title="Salary information" icon={Wallet} tone="success">
          <F label="Basic salary">
            <Input
              type="number"
              className="font-mono"
              value={form.basicSalary}
              onChange={(e) => updateField("basicSalary", e.target.value)}
              placeholder="200000"
            />
          </F>

          <F label="Fuel allowance">
            <Input
              type="number"
              className="font-mono"
              value={form.fuelAllowance}
              onChange={(e) => updateField("fuelAllowance", e.target.value)}
              placeholder="15000"
              disabled={form.status !== "Permanent"}
            />
          </F>

          <F label="OPD allowance">
            <Input
              type="number"
              className="font-mono"
              value={form.opdAllowance}
              onChange={(e) => updateField("opdAllowance", e.target.value)}
              placeholder="5000"
              disabled={form.status !== "Permanent"}
            />
          </F>
        </Section>

        <Section
          title="Documents"
          icon={FileText}
          tone="warning"
          description="Google Drive upload will be connected later."
        >
          <div className="flex flex-col items-center gap-2.5 rounded-lg border border-dashed px-6 py-8 text-center sm:col-span-2">
            <IconTile icon={Upload} tone="neutral" size="md" />
            <div>
              <p className="text-[13px] font-medium leading-[18px]">Document upload pending</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                CNIC, Educational Certificates, Medical Documents
              </p>
            </div>
          </div>
        </Section>

        <div className="flex flex-col-reverse gap-3 border-t border-divider pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-muted-foreground">Unsaved new employee</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" asChild>
              <Link to="/employees">Cancel</Link>
            </Button>

            <Button onClick={handleSubmit} disabled={createEmployee.isPending}>
              {createEmployee.isPending ? "Saving..." : "Save employee"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
