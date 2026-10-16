import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth/AuthContext";
import { ChartCard } from "@/components/shared/ChartCard";
import { IconTile } from "@/components/shared/IconTile";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Bell, Lock, ShieldCheck, Upload, User as UserIcon } from "lucide-react";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({ meta: [{ title: "Profile — LDS HRMS" }] }),
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
        <PageHeader
          icon={UserIcon}
          title="My profile"
          description="Your account and sign-in details."
        />
        <div className="rounded-xl border bg-card p-5 text-[13px] text-muted-foreground">
          Loading profile...
        </div>
      </div>
    );
  }

  const displayName = employee?.name || user?.username || "Admin";
  const roleLabel = user?.role === "Admin" ? "Administrator" : "Employee";

  const readOnly = (label: string, value: string, mono?: boolean) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={value} readOnly className={mono ? "font-mono" : undefined} />
    </div>
  );

  return (
    <div>
      <PageHeader
        icon={UserIcon}
        title="My profile"
        description="Your account and sign-in details."
      />

      <div className="mb-5 flex flex-col gap-4 rounded-xl border bg-card p-5 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <Avatar className="size-14">
            <AvatarFallback className="bg-foreground text-lg text-background">
              {initials(displayName)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold leading-6">{displayName}</h2>
            <p className="text-[13px] leading-[18px] text-muted-foreground">
              {employee
                ? `${employee.designation || roleLabel} · ${employee.department || "Admin"}`
                : `${roleLabel} · signed in as ${user?.username ?? "—"}`}
            </p>
          </div>
        </div>

        <Button variant="outline" size="sm" disabled className="self-start sm:self-auto">
          <Upload />
          Change photo
        </Button>
      </div>

      <Tabs defaultValue="personal">
        <TabsList>
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="mt-5">
          <ChartCard title="Personal" icon={UserIcon} bodyClassName="">
            <div className="grid gap-x-3 gap-y-4 sm:grid-cols-2">
              {readOnly("Username", user?.username ?? "")}
              {readOnly("Role", roleLabel)}

              {employee ? (
                <>
                  {readOnly("Full name", employee.name || "")}
                  {readOnly("Employee code", employee.employeeCode || "", true)}
                  {readOnly("Email", employee.email || "")}
                  {readOnly("Phone", employee.phone || "")}
                </>
              ) : (
                <div className="rounded-lg border bg-subtle px-4 py-3 text-[13px] text-text-secondary sm:col-span-2">
                  This login is not attached to an employee record, so it has no personal details of
                  its own. Staff details live on the Employees page.
                </div>
              )}
            </div>
          </ChartCard>
        </TabsContent>

        <TabsContent value="security" className="mt-5">
          <ChartCard
            title="Security"
            icon={Lock}
            tone="violet"
            action={<StatusBadge status="coming_soon" label="Coming soon" />}
            bodyClassName=""
          >
            <div className="flex items-start gap-3">
              <IconTile icon={ShieldCheck} tone="neutral" size="md" className="border" />
              <div>
                <p className="text-sm font-medium">Password</p>
                <p className="text-[13px] leading-[18px] text-muted-foreground">
                  Changing your password from this page isn&apos;t wired up yet.
                </p>
              </div>
            </div>
          </ChartCard>
        </TabsContent>

        <TabsContent value="notifications" className="mt-5">
          <ChartCard
            title="Notifications"
            icon={Bell}
            tone="warning"
            action={<StatusBadge status="coming_soon" label="Coming soon" />}
            bodyClassName=""
          >
            <div className="rounded-lg border bg-subtle px-4 py-3 text-[13px] text-text-secondary">
              Notifications aren&apos;t sent yet, so there is nothing to configure. The switches
              below are placeholders.
            </div>
            <div className="mt-2">
              {[
                "Email notifications",
                "Leave approval alerts",
                "Payroll reminders",
                "Attendance summaries",
              ].map((n) => (
                <div
                  key={n}
                  className="flex items-center justify-between gap-3 border-b border-divider py-3 last:border-0 last:pb-0"
                >
                  <span className="text-sm text-muted-foreground">{n}</span>
                  <Switch disabled aria-label={n} />
                </div>
              ))}
            </div>
          </ChartCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
