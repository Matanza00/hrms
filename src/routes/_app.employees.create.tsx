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
import { UploadCloud } from "lucide-react";
import { useState } from "react";
import { useCreateEmployee } from "@/hooks/useEmployees";

export const Route = createFileRoute("/_app/employees/create")({
  component: EmployeeCreate,
});

function Section({
  title,
  children,
  description,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-card p-6">
      <div className="mb-4">
        <h3 className="text-sm font-semibold">{title}</h3>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {description}
          </p>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function F({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
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
  status: "Permanent" | "Contract" | "Probation" | "Intern";
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

  function updateField<K extends keyof EmployeeForm>(
    field: K,
    value: EmployeeForm[K]
  ) {
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
        fuelAllowance:
          form.status === "Permanent" ? Number(form.fuelAllowance || 0) : 0,
        opdAllowance:
          form.status === "Permanent" ? Number(form.opdAllowance || 0) : 0,
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
        eyebrow="Employees"
        title="Add new employee"
        description="Onboard a new team member with their personal, employment and salary details."
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link to="/employees">Cancel</Link>
            </Button>

            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={createEmployee.isPending}
            >
              {createEmployee.isPending ? "Saving..." : "Save employee"}
            </Button>
          </>
        }
      />

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-4 max-w-5xl">
        <Section title="Personal information">
          <F label="Full name">
            <Input
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="John Doe"
            />
          </F>

          <F label="Email">
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
          description="A login is created automatically: the Login ID is the employee code and the password is admin12345."
        >
          <F label="Employee code">
            <Input
              value={form.employeeCode}
              onChange={(e) => updateField("employeeCode", e.target.value)}
              placeholder="EMP001"
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
                {[
                  "Engineering",
                  "Design",
                  "Accounts",
                  "HR",
                  "Marketing",
                  "Operations",
                ].map((d) => (
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
              onValueChange={(value) =>
                updateField(
                  "status",
                  value as "Permanent" | "Contract" | "Probation" | "Intern"
                )
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Permanent">Permanent</SelectItem>
                <SelectItem value="Contract">Contract</SelectItem>
                <SelectItem value="Probation">Probation</SelectItem>
                <SelectItem value="Intern">Intern</SelectItem>
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

        <Section title="Salary information">
          <F label="Basic salary">
            <Input
              type="number"
              value={form.basicSalary}
              onChange={(e) => updateField("basicSalary", e.target.value)}
              placeholder="200000"
            />
          </F>

          <F label="Fuel allowance">
            <Input
              type="number"
              value={form.fuelAllowance}
              onChange={(e) => updateField("fuelAllowance", e.target.value)}
              placeholder="15000"
              disabled={form.status !== "Permanent"}
            />
          </F>

          <F label="OPD allowance">
            <Input
              type="number"
              value={form.opdAllowance}
              onChange={(e) => updateField("opdAllowance", e.target.value)}
              placeholder="5000"
              disabled={form.status !== "Permanent"}
            />
          </F>
        </Section>

        <Section
          title="Documents"
          description="Google Drive upload will be connected later."
        >
          <div className="sm:col-span-2 rounded-xl border-2 border-dashed p-8 text-center opacity-70">
            <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full bg-muted">
              <UploadCloud className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium">Document upload pending</p>
            <p className="text-xs text-muted-foreground mt-1">
              CNIC, Educational Certificates, Medical Documents
            </p>
          </div>
        </Section>

        <div className="flex justify-end gap-2 pb-6">
          <Button variant="outline" asChild>
            <Link to="/employees">Cancel</Link>
          </Button>

          <Button onClick={handleSubmit} disabled={createEmployee.isPending}>
            {createEmployee.isPending ? "Saving..." : "Save employee"}
          </Button>
        </div>
      </div>
    </div>
  );
}