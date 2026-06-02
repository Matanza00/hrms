import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const logs = [
  { action: "Logged in", time: "2 minutes ago", ip: "192.168.1.20" },
  { action: "Updated profile photo", time: "Yesterday", ip: "192.168.1.20" },
  { action: "Changed password", time: "Last week", ip: "203.142.5.11" },
  { action: "Approved leave for Imran", time: "2 weeks ago", ip: "192.168.1.20" },
];

export const Route = createFileRoute("/_app/profile")({
  component: () => (
    <div>
      <PageHeader title="My profile" description="Manage personal info, security and notifications." />
      <div className="rounded-2xl border bg-card p-6 mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <Avatar className="h-16 w-16"><AvatarFallback className="text-base bg-primary text-primary-foreground">AK</AvatarFallback></Avatar>
        <div className="flex-1">
          <h2 className="text-lg font-semibold">Ayesha Khan</h2>
          <p className="text-sm text-muted-foreground">Senior Frontend Engineer · Engineering</p>
        </div>
        <Button variant="outline" size="sm">Change photo</Button>
      </div>

      <Tabs defaultValue="personal">
        <TabsList>
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
        <TabsContent value="personal" className="mt-4">
          <div className="rounded-2xl border bg-card p-6 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label className="text-xs">Full name</Label><Input defaultValue="Ayesha Khan" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Email</Label><Input defaultValue="ayesha@nexus.co" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Phone</Label><Input defaultValue="+92 300 1234567" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Address</Label><Input defaultValue="DHA Phase 5, Lahore" /></div>
          </div>
        </TabsContent>
        <TabsContent value="security" className="mt-4">
          <div className="rounded-2xl border bg-card p-6 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label className="text-xs">Current password</Label><Input type="password" /></div>
            <div className="space-y-1.5" />
            <div className="space-y-1.5"><Label className="text-xs">New password</Label><Input type="password" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Confirm new password</Label><Input type="password" /></div>
            <div className="sm:col-span-2 flex items-center justify-between rounded-xl border p-4">
              <div><p className="text-sm font-medium">Two-factor authentication</p><p className="text-xs text-muted-foreground">Add an extra layer of security</p></div>
              <Switch />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="notifications" className="mt-4">
          <div className="rounded-2xl border bg-card p-6 space-y-3">
            {["Email notifications","Leave approval alerts","Payroll reminders","Attendance summaries"].map((n) => (
              <div key={n} className="flex items-center justify-between border-b last:border-0 pb-3 last:pb-0">
                <span className="text-sm">{n}</span><Switch defaultChecked />
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="activity" className="mt-4">
          <div className="rounded-2xl border bg-card p-6">
            <ul className="space-y-3">
              {logs.map((l, i) => (
                <li key={i} className="flex items-start justify-between text-sm border-b last:border-0 pb-3 last:pb-0">
                  <div>
                    <p className="font-medium">{l.action}</p>
                    <p className="text-xs text-muted-foreground">{l.time} · IP {l.ip}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  ),
});
