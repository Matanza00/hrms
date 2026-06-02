import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UploadCloud } from "lucide-react";

export const Route = createFileRoute("/_app/employees/create")({
  component: EmployeeCreate,
});

function Section({ title, children, description }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-6">
      <div className="mb-4">
        <h3 className="text-sm font-semibold">{title}</h3>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function EmployeeCreate() {
  return (
    <div>
      <PageHeader
        eyebrow="Employees"
        title="Add new employee"
        description="Onboard a new team member with their personal, employment and salary details."
        actions={
          <>
            <Button variant="outline" size="sm" asChild><Link to="/employees">Cancel</Link></Button>
            <Button size="sm">Save employee</Button>
          </>
        }
      />

      <div className="space-y-4 max-w-5xl">
        <Section title="Personal information">
          <F label="Full name"><Input placeholder="John Doe" /></F>
          <F label="Email"><Input type="email" placeholder="john@nexus.co" /></F>
          <F label="Phone"><Input placeholder="+92 300 0000000" /></F>
          <F label="CNIC"><Input placeholder="00000-0000000-0" /></F>
          <F label="Date of birth"><Input type="date" /></F>
          <F label="Emergency contact"><Input placeholder="+92 300 0000000" /></F>
          <div className="sm:col-span-2"><F label="Address"><Textarea rows={2} /></F></div>
        </Section>

        <Section title="Employment information">
          <F label="Employee code"><Input placeholder="NEX-009" /></F>
          <F label="Department">
            <Select><SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
              <SelectContent>{["Engineering","Design","Accounts","HR","Marketing","Operations"].map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
          </F>
          <F label="Designation"><Input placeholder="Senior Engineer" /></F>
          <F label="Status">
            <Select defaultValue="active"><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="probation">Probation</SelectItem><SelectItem value="on_leave">On Leave</SelectItem><SelectItem value="terminated">Terminated</SelectItem></SelectContent>
            </Select>
          </F>
          <F label="Joining date"><Input type="date" /></F>
          <F label="Permanent date"><Input type="date" /></F>
          <F label="End date"><Input type="date" /></F>
        </Section>

        <Section title="Salary information">
          <F label="Basic salary"><Input type="number" placeholder="200000" /></F>
          <F label="Fuel allowance"><Input type="number" placeholder="15000" /></F>
          <F label="OPD allowance"><Input type="number" placeholder="5000" /></F>
        </Section>

        <Section title="Documents" description="Upload CNIC, contract, offer letter and other docs.">
          <div className="sm:col-span-2 rounded-xl border-2 border-dashed p-8 text-center">
            <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full bg-muted"><UploadCloud className="h-5 w-5" /></div>
            <p className="text-sm font-medium">Drop files here or click to upload</p>
            <p className="text-xs text-muted-foreground mt-1">PDF, PNG, JPG up to 5MB</p>
          </div>
        </Section>

        <div className="flex justify-end gap-2 pb-6">
          <Button variant="outline" asChild><Link to="/employees">Cancel</Link></Button>
          <Button>Save employee</Button>
        </div>
      </div>
    </div>
  );
}
