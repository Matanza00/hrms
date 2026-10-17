import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEmployee, useUpdateEmployee } from "@/hooks/useEmployees";
import { useEffect, useState, type ReactNode } from "react";
import { Building2, User, UserPen, Wallet, type LucideIcon } from "lucide-react";
import { IconTile } from "@/components/shared/IconTile";
import type { Tone } from "@/lib/tones";
import type { Employee } from "@/lib/api/employees";

export const Route = createFileRoute("/_app/employees/$id/edit")({
  head: () => ({ meta: [{ title: "Edit Employee — LDS HRMS" }] }),
  component: EditEmployee,
});

/** The employee plus the form-only "has left LDS" switch. */
type EmployeeForm = Partial<Employee> & { hasLeft?: boolean };

function EditEmployee() {
  const { id } = useParams({ from: "/_app/employees/$id/edit" });
  const navigate = useNavigate();

  const { data: emp, isLoading, error } = useEmployee(id);
  const updateEmployee = useUpdateEmployee();

  const [form, setForm] = useState<EmployeeForm>({});
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (emp) {
      setForm({
        ...emp,
        // An inactive employee is one who has left LDS; only they have an end date.
        hasLeft: !(emp.active === true || emp.active === "TRUE"),
        endDate: String(emp.endDate ?? "").slice(0, 10),
      });
    }
  }, [emp]);

  function handleChange(field: string, value: string | boolean) {
    setSaveError("");
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleSubmit() {
    if (form.hasLeft && !form.endDate) {
      setSaveError("Enter the date the employee left LDS.");
      return;
    }

    try {
      await updateEmployee.mutateAsync({
        employeeId: id,
        data: {
          name: form.name,
          email: form.email,
          phone: form.phone,
          designation: form.designation,
          department: form.department,
          status: form.status,
          basicSalary: Number(form.basicSalary || 0),
          fuelAllowance: Number(form.fuelAllowance || 0),
          opdAllowance: Number(form.opdAllowance || 0),
          // Leaving LDS deactivates the employee (and their login); the end
          // date only applies to someone who has left.
          active: !form.hasLeft,
          endDate: form.hasLeft ? form.endDate : null,
        },
      });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save employee.");
      return;
    }

    navigate({
      to: "/employees/$id",
      params: { id },
    });
  }

  if (isLoading) return <p className="text-[13px] text-muted-foreground">Loading employee...</p>;

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

  const field = (key: keyof EmployeeForm, label: string, type?: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={`edit-${key}`}>{label}</Label>
      <Input
        id={`edit-${key}`}
        type={type}
        value={String(form[key] ?? "")}
        onChange={(e) => handleChange(key, e.target.value)}
        className={type === "number" ? "font-mono" : undefined}
      />
    </div>
  );

  return (
    <div>
      <PageHeader
        icon={UserPen}
        eyebrow="Employees"
        title={`Edit ${emp.name}`}
        description="Update contact, role and salary details."
      />

      {saveError && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-danger-line bg-danger-tint px-4 py-3 text-[13px] text-danger-ink"
        >
          {saveError}
        </div>
      )}

      <div className="space-y-5">
        <Section title="Personal information" icon={User}>
          {field("name", "Name")}
          {field("email", "Email")}
          {field("phone", "Phone")}
        </Section>

        <Section title="Employment information" icon={Building2} tone="violet">
          {field("designation", "Designation")}
          {field("department", "Department")}

          <div className="space-y-1.5">
            <Label htmlFor="edit-status">Employment status</Label>
            <Select
              value={form.status || ""}
              onValueChange={(value) => handleChange("status", value)}
            >
              <SelectTrigger id="edit-status">
                <SelectValue placeholder="Select status" />
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
            <p className="text-xs text-muted-foreground">
              Set to “Notice Period” when an employee resigns and is serving notice.
            </p>
          </div>

          <div className="flex items-start gap-3 border-t border-divider pt-4 sm:col-span-2">
            <Switch
              id="has-left"
              checked={!!form.hasLeft}
              onCheckedChange={(checked) => handleChange("hasLeft", checked)}
              className="mt-0.5"
            />
            <div>
              <Label htmlFor="has-left" className="text-sm">
                Has left LDS
              </Label>
              <p className="text-xs text-muted-foreground">
                Turn on when the employee resigns or is let go. Their login is disabled until this
                is turned off again.
              </p>
            </div>
          </div>

          {form.hasLeft && field("endDate", "End date", "date")}
        </Section>

        <Section title="Salary information" icon={Wallet} tone="success">
          {field("basicSalary", "Basic salary", "number")}
          {field("fuelAllowance", "Fuel allowance", "number")}
          {field("opdAllowance", "OPD allowance", "number")}
        </Section>

        <div className="flex justify-end gap-2 border-t border-divider pt-4">
          <Button variant="outline" asChild>
            <Link to="/employees/$id" params={{ id }}>
              Cancel
            </Link>
          </Button>
          <Button onClick={handleSubmit} disabled={updateEmployee.isPending}>
            {updateEmployee.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Figma "Card" with a form body: icon-tile header row, then a two-column grid. */
function Section({
  title,
  icon,
  tone = "info",
  children,
}: {
  title: string;
  icon: LucideIcon;
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <header className="flex items-center gap-2.5 border-b border-divider px-5 py-3.5">
        <IconTile icon={icon} tone={tone} />
        <h3 className="text-sm font-semibold leading-5 tracking-[-0.2px]">{title}</h3>
      </header>
      <div className="grid gap-x-3 gap-y-4 p-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}
