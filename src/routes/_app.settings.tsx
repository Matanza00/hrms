import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-6">
      <h3 className="text-sm font-semibold mb-4">{title}</h3>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}

export const Route = createFileRoute("/_app/settings")({
  component: () => (
    <div>
      <PageHeader title="Settings" description="Configure office, attendance, payroll and appearance." />
      <Tabs defaultValue="office">
        <TabsList>
          <TabsTrigger value="office">Office</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="holidays">Holidays</TabsTrigger>
          <TabsTrigger value="theme">Theme</TabsTrigger>
        </TabsList>
        <TabsContent value="office" className="mt-4 space-y-4">
          <Section title="Office information">
            <F label="Company name"><Input defaultValue="Nexus Technologies" /></F>
            <F label="Contact email"><Input defaultValue="hello@nexus.co" /></F>
            <F label="Phone"><Input defaultValue="+92 42 35000000" /></F>
            <F label="Timezone"><Input defaultValue="Asia/Karachi" /></F>
          </Section>
          <Section title="Office location">
            <F label="Address"><Input defaultValue="DHA Phase 5, Lahore" /></F>
            <F label="Latitude"><Input defaultValue="31.4697" /></F>
            <F label="Longitude"><Input defaultValue="74.4116" /></F>
            <F label="Office radius (meters)"><Input type="number" defaultValue={200} /></F>
          </Section>
        </TabsContent>
        <TabsContent value="attendance" className="mt-4">
          <Section title="Attendance settings">
            <F label="Standard start time"><Input type="time" defaultValue="09:00" /></F>
            <F label="Standard end time"><Input type="time" defaultValue="18:00" /></F>
            <F label="Late grace period (min)"><Input type="number" defaultValue={15} /></F>
            <F label="Minimum working hours"><Input type="number" defaultValue={8} /></F>
            <div className="sm:col-span-2 flex items-center justify-between rounded-xl border p-4">
              <div><p className="text-sm font-medium">Geofencing</p><p className="text-xs text-muted-foreground">Restrict check-in to office radius</p></div>
              <Switch defaultChecked />
            </div>
          </Section>
        </TabsContent>
        <TabsContent value="payroll" className="mt-4">
          <Section title="Payroll settings">
            <F label="Pay cycle"><Input defaultValue="Monthly" /></F>
            <F label="Pay day"><Input type="number" defaultValue={30} /></F>
            <F label="Default tax rate (%)"><Input type="number" defaultValue={8} /></F>
            <F label="EOBI contribution"><Input type="number" defaultValue={370} /></F>
          </Section>
        </TabsContent>
        <TabsContent value="holidays" className="mt-4">
          <Section title="Holiday settings">
            <F label="Weekly off"><Input defaultValue="Sunday" /></F>
            <F label="Half-day Saturdays"><Input defaultValue="Yes" /></F>
          </Section>
        </TabsContent>
        <TabsContent value="theme" className="mt-4">
          <Section title="Appearance">
            <div className="sm:col-span-2 flex items-center justify-between rounded-xl border p-4">
              <div><p className="text-sm font-medium">Dark mode</p><p className="text-xs text-muted-foreground">Toggle in the top bar</p></div>
              <Switch />
            </div>
          </Section>
        </TabsContent>
      </Tabs>
      <div className="mt-5 flex justify-end gap-2"><Button variant="outline">Cancel</Button><Button>Save changes</Button></div>
    </div>
  ),
});
