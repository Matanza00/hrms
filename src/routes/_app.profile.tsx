import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth/AuthContext";

export const Route = createFileRoute("/_app/profile")({
  component: ProfilePage,
});

function initials(name?: string | null) {
  if (!name) return "AD";

  return name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function ProfilePage() {
  // The signed-in account, never a guess. `employee` is the record this login
  // is linked to; the admin login is linked to nobody, so there is no name,
  // email or address to show — showing someone else's would be a lie.
  const { user, employee, status } = useAuth();

  if (status === "loading") {
    return (
      <div>
        <PageHeader title="My profile" description="Your account and sign-in details." />
        <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
          Loading profile...
        </div>
      </div>
    );
  }

  const displayName = employee?.name || user?.username || "Admin";
  const roleLabel = user?.role === "Admin" ? "Administrator" : "Employee";

  return (
    <div>
      <PageHeader title="My profile" description="Your account and sign-in details." />

      <div className="mb-6 flex flex-col gap-4 rounded-2xl border bg-card p-6 sm:flex-row sm:items-center">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="bg-primary text-base text-primary-foreground">
            {initials(displayName)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <h2 className="text-lg font-semibold">{displayName}</h2>
          <p className="text-sm text-muted-foreground">
            {employee
              ? `${employee.designation || roleLabel} · ${employee.department || "Admin"}`
              : `${roleLabel} · signed in as ${user?.username ?? "—"}`}
          </p>
        </div>

        <Button variant="outline" size="sm" disabled>
          Change photo
        </Button>
      </div>

      <Tabs defaultValue="personal">
        <TabsList>
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="mt-4">
          <div className="grid gap-4 rounded-2xl border bg-card p-6 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Username</Label>
              <Input value={user?.username ?? ""} readOnly />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Role</Label>
              <Input value={roleLabel} readOnly />
            </div>

            {employee ? (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Full name</Label>
                  <Input value={employee.name || ""} readOnly />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Employee code</Label>
                  <Input value={employee.employeeCode || ""} readOnly />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Email</Label>
                  <Input value={employee.email || ""} readOnly />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Phone</Label>
                  <Input value={employee.phone || ""} readOnly />
                </div>
              </>
            ) : (
              <div className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground sm:col-span-2">
                This login is not attached to an employee record, so it has no personal details of
                its own. Staff details live on the Employees page.
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="security" className="mt-4">
          <div className="rounded-2xl border bg-card p-6">
            <p className="text-sm font-medium">Password</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Changing your password from this page isn&apos;t wired up yet.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <div className="rounded-2xl border bg-card p-6">
            <p className="text-sm text-muted-foreground">
              Notifications aren&apos;t sent yet, so there is nothing to configure. The switches
              below are placeholders.
            </p>
            <div className="mt-4 space-y-3 opacity-60">
              {[
                "Email notifications",
                "Leave approval alerts",
                "Payroll reminders",
                "Attendance summaries",
              ].map((n) => (
                <div
                  key={n}
                  className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                >
                  <span className="text-sm">{n}</span>
                  <Switch disabled />
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
