import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSettings, updateSettings, type SettingsMap } from "@/lib/api/settings";
import { useEffect, useState } from "react";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-6">
      <h3 className="text-sm font-semibold mb-4">{title}</h3>
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

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});

const defaultSettings: SettingsMap = {
  companyName: "Legit Design Studio",
  contactEmail: "",
  phone: "",
  timezone: "Asia/Karachi",

  officeAddress: "",
  officeLatitude: "",
  officeLongitude: "",
  officeRadiusMeters: 200,

  officeStartTime: "18:00",
  officeEndTime: "03:00",
  breakHours: 1,
  requiredHours: 8,
  officeSpanHours: 9,
  graceMinutes: 30,

  annualLeave: 10,
  casualLeave: 5,
  sickLeave: 5,

  deficitHalfDayHours: 4,
  deficitFullDayHours: 8,
  lateHalfDayCount: 2,
  lateFullDayCount: 3,

  payCycle: "Monthly",
  payDay: 1,
  workingDaysPerMonth: 26,

  saturdayOff: true,
  sundayOff: true,
  geofencingEnabled: true,
};

function SettingsPage() {
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
  });

  const [form, setForm] = useState<SettingsMap>(defaultSettings);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (data) {
      setForm({
        ...defaultSettings,
        ...data,
      });
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      setMessage("Settings saved successfully.");
    },
  });

  function setField(key: string, value: string | number | boolean) {
    setMessage("");
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function getValue(key: string) {
    return String(form[key] ?? "");
  }

  function getBoolean(key: string) {
    const value = form[key];
    return value === true || value === "TRUE" || value === "true";
  }

  async function handleSave() {
    await mutation.mutateAsync(form);
  }

  if (isLoading) {
    return (
      <div>
        <PageHeader
          title="Settings"
          description="Configure office, attendance, payroll and leave rules."
        />
        <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
          Loading settings...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader
          title="Settings"
          description="Configure office, attendance, payroll and leave rules."
        />
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {error instanceof Error ? error.message : "Something went wrong"}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Configure office, attendance, payroll and leave rules."
      />

      {message && (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      )}

      <Tabs defaultValue="office">
        <TabsList>
          <TabsTrigger value="office">Office</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="leave">Leave</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="holidays">Holidays</TabsTrigger>
        </TabsList>

        <TabsContent value="office" className="mt-4 space-y-4">
          <Section title="Office information">
            <F label="Company name">
              <Input
                value={getValue("companyName")}
                onChange={(e) => setField("companyName", e.target.value)}
              />
            </F>

            <F label="Contact email">
              <Input
                value={getValue("contactEmail")}
                onChange={(e) => setField("contactEmail", e.target.value)}
              />
            </F>

            <F label="Phone">
              <Input
                value={getValue("phone")}
                onChange={(e) => setField("phone", e.target.value)}
              />
            </F>

            <F label="Timezone">
              <Input
                value={getValue("timezone")}
                onChange={(e) => setField("timezone", e.target.value)}
              />
            </F>
          </Section>

          <Section title="Office location">
            <F label="Address">
              <Input
                value={getValue("officeAddress")}
                onChange={(e) => setField("officeAddress", e.target.value)}
              />
            </F>

            <F label="Latitude">
              <Input
                value={getValue("officeLatitude")}
                onChange={(e) => setField("officeLatitude", e.target.value)}
              />
            </F>

            <F label="Longitude">
              <Input
                value={getValue("officeLongitude")}
                onChange={(e) => setField("officeLongitude", e.target.value)}
              />
            </F>

            <F label="Office radius (meters)">
              <Input
                type="number"
                value={getValue("officeRadiusMeters")}
                onChange={(e) => setField("officeRadiusMeters", Number(e.target.value))}
              />
            </F>
          </Section>
        </TabsContent>

        <TabsContent value="attendance" className="mt-4">
          <Section title="Attendance settings">
            <F label="Office start time">
              <Input
                type="time"
                value={getValue("officeStartTime")}
                onChange={(e) => setField("officeStartTime", e.target.value)}
              />
            </F>

            <F label="Office end time">
              <Input
                type="time"
                value={getValue("officeEndTime")}
                onChange={(e) => setField("officeEndTime", e.target.value)}
              />
            </F>

            <F label="Late grace period (minutes)">
              <Input
                type="number"
                value={getValue("graceMinutes")}
                onChange={(e) => setField("graceMinutes", Number(e.target.value))}
              />
            </F>

            <F label="Required working hours">
              <Input
                type="number"
                value={getValue("requiredHours")}
                onChange={(e) => setField("requiredHours", Number(e.target.value))}
              />
            </F>

            <F label="Office span hours">
              <Input
                type="number"
                value={getValue("officeSpanHours")}
                onChange={(e) => setField("officeSpanHours", Number(e.target.value))}
              />
            </F>

            <F label="Break cap hours">
              <Input
                type="number"
                value={getValue("breakHours")}
                onChange={(e) => setField("breakHours", Number(e.target.value))}
              />
            </F>

            <F label="Deficit half day hours">
              <Input
                type="number"
                value={getValue("deficitHalfDayHours")}
                onChange={(e) => setField("deficitHalfDayHours", Number(e.target.value))}
              />
            </F>

            <F label="Deficit full day hours">
              <Input
                type="number"
                value={getValue("deficitFullDayHours")}
                onChange={(e) => setField("deficitFullDayHours", Number(e.target.value))}
              />
            </F>

            <F label="Late half day count">
              <Input
                type="number"
                value={getValue("lateHalfDayCount")}
                onChange={(e) => setField("lateHalfDayCount", Number(e.target.value))}
              />
            </F>

            <F label="Late full day count">
              <Input
                type="number"
                value={getValue("lateFullDayCount")}
                onChange={(e) => setField("lateFullDayCount", Number(e.target.value))}
              />
            </F>

            <div className="sm:col-span-2 flex items-center justify-between rounded-xl border p-4">
              <div>
                <p className="text-sm font-medium">Geofencing</p>
                <p className="text-xs text-muted-foreground">Restrict check-in to office radius</p>
              </div>

              <Switch
                checked={getBoolean("geofencingEnabled")}
                onCheckedChange={(v) => setField("geofencingEnabled", v)}
              />
            </div>
          </Section>
        </TabsContent>

        <TabsContent value="leave" className="mt-4">
          <Section title="Leave settings">
            <F label="Annual leave">
              <Input
                type="number"
                value={getValue("annualLeave")}
                onChange={(e) => setField("annualLeave", Number(e.target.value))}
              />
            </F>

            <F label="Casual leave">
              <Input
                type="number"
                value={getValue("casualLeave")}
                onChange={(e) => setField("casualLeave", Number(e.target.value))}
              />
            </F>

            <F label="Sick leave">
              <Input
                type="number"
                value={getValue("sickLeave")}
                onChange={(e) => setField("sickLeave", Number(e.target.value))}
              />
            </F>
          </Section>
        </TabsContent>

        <TabsContent value="payroll" className="mt-4">
          <Section title="Payroll settings">
            <F label="Pay cycle">
              <Input
                value={getValue("payCycle")}
                onChange={(e) => setField("payCycle", e.target.value)}
              />
            </F>

            <F label="Pay day">
              <Input
                type="number"
                value={getValue("payDay")}
                onChange={(e) => setField("payDay", Number(e.target.value))}
              />
            </F>

            <F label="Working days per month">
              <Input
                type="number"
                min={1}
                max={31}
                value={getValue("workingDaysPerMonth")}
                onChange={(e) =>
                  // Zero would make a day of salary worth nothing and silently
                  // wipe out every deduction, so never store it.
                  setField("workingDaysPerMonth", Math.max(1, Number(e.target.value) || 26))
                }
              />
              <p className="text-xs text-muted-foreground">
                One day of salary is the monthly gross divided by this number, so it sets what a
                late or deficit deduction costs. 26 treats the month as a six-day week; September
                itself had 22 working days.
              </p>
            </F>
          </Section>
        </TabsContent>

        <TabsContent value="holidays" className="mt-4">
          <Section title="Holiday settings">
            <div className="sm:col-span-2 flex items-center justify-between rounded-xl border p-4">
              <div>
                <p className="text-sm font-medium">Saturday off</p>
                <p className="text-xs text-muted-foreground">
                  Saturday is normally off unless special working day exists.
                </p>
              </div>

              <Switch
                checked={getBoolean("saturdayOff")}
                onCheckedChange={(v) => setField("saturdayOff", v)}
              />
            </div>

            <div className="sm:col-span-2 flex items-center justify-between rounded-xl border p-4">
              <div>
                <p className="text-sm font-medium">Sunday off</p>
                <p className="text-xs text-muted-foreground">
                  Sunday is normally off unless special working day exists.
                </p>
              </div>

              <Switch
                checked={getBoolean("sundayOff")}
                onCheckedChange={(v) => setField("sundayOff", v)}
              />
            </div>
          </Section>
        </TabsContent>
      </Tabs>

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={() => setForm(defaultSettings)}>
          Reset local
        </Button>

        <Button onClick={handleSave} disabled={mutation.isPending}>
          {mutation.isPending ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
