import { createFileRoute } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  CircleCheck,
  Clock,
  Coffee,
  MapPin,
  PartyPopper,
  Settings,
  Timer,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { ChartCard } from "@/components/shared/ChartCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSettings, updateSettings, type SettingsMap } from "@/lib/api/settings";
import type { Tone } from "@/lib/tones";
import { useEffect, useId, useState } from "react";

/** Figma "Settings" form card: icon-tile header row, then a two-column field grid. */
function Section({
  title,
  description,
  icon,
  tone = "info",
  children,
}: {
  title: string;
  description?: string;
  icon: LucideIcon;
  tone?: Tone;
  children: React.ReactNode;
}) {
  return (
    <ChartCard title={title} description={description} icon={icon} tone={tone} bodyClassName="">
      <div className="grid gap-x-3 gap-y-4 pb-1 sm:grid-cols-2">{children}</div>
    </ChartCard>
  );
}

function F({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: (id: string) => React.ReactNode;
}) {
  const id = useId();
  return (
    <div className={className}>
      <Label htmlFor={id} className="mb-1.5 block">
        {label}
      </Label>
      {children(id)}
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** A label/description row with a switch on the right (Holidays, Geofencing). */
function ToggleRow({
  title,
  description,
  checked,
  onCheckedChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={title} />
    </div>
  );
}

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings — LDS HRMS" }] }),
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

/** "18:00" → "6:00 PM"; anything unparseable is returned as is. */
function to12h(value: string) {
  const m = /^(\d{1,2}):(\d{2})/.exec(value);
  if (!m) return value;
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h < 12 ? "AM" : "PM"}`;
}

const DESCRIPTION = "Configure office, attendance, payroll and leave rules.";

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
    meta: { inlineErrors: true },
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

  function discardChanges() {
    setMessage("");
    mutation.reset();
    // Back to what the server last returned, not the hard-coded defaults.
    setForm({ ...defaultSettings, ...(data ?? {}) });
  }

  async function handleSave() {
    try {
      await mutation.mutateAsync(form);
    } catch {
      // Shown below from mutation.error.
    }
  }

  const text = (key: string, type?: string) => (id: string) => (
    <Input
      id={id}
      type={type}
      value={getValue(key)}
      onChange={(e) => setField(key, e.target.value)}
    />
  );
  const num = (key: string) => (id: string) => (
    <Input
      id={id}
      type="number"
      inputMode="decimal"
      className="font-mono"
      value={getValue(key)}
      onChange={(e) => setField(key, Number(e.target.value))}
    />
  );

  if (isLoading) {
    return (
      <div>
        <PageHeader icon={Settings} title="Settings" description={DESCRIPTION} />
        <div className="rounded-2xl border bg-card p-6 text-[13px] text-muted-foreground">
          Loading settings...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader icon={Settings} title="Settings" description={DESCRIPTION} />
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-danger-line bg-danger-tint px-4 py-3 text-[13px] text-danger-ink"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          {error instanceof Error ? error.message : "Something went wrong"}
        </div>
      </div>
    );
  }

  const shiftSummary = `Shift: ${to12h(getValue("officeStartTime"))} → ${to12h(getValue("officeEndTime"))}${
    getValue("officeEndTime") < getValue("officeStartTime") ? " next day" : ""
  } · ${getValue("officeSpanHours")}h span · ${getValue("requiredHours")}h required`;

  return (
    <div>
      <PageHeader icon={Settings} title="Settings" description={DESCRIPTION} />

      <Tabs defaultValue="office">
        <TabsList>
          <TabsTrigger value="office">Office</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="leave">Leave</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="holidays">Holidays</TabsTrigger>
        </TabsList>

        <TabsContent value="office" className="mt-5 space-y-5">
          <Section title="Office information" icon={Building2}>
            <F label="Company name">{text("companyName")}</F>
            <F label="Contact email">{text("contactEmail", "email")}</F>
            <F label="Phone">{text("phone", "tel")}</F>
            <F label="Timezone">{text("timezone")}</F>
          </Section>

          <Section title="Office location" icon={MapPin} tone="danger">
            <F label="Address">{text("officeAddress")}</F>
            <F label="Latitude">
              {(id) => (
                <Input
                  id={id}
                  inputMode="decimal"
                  className="font-mono"
                  value={getValue("officeLatitude")}
                  onChange={(e) => setField("officeLatitude", e.target.value)}
                />
              )}
            </F>
            <F label="Longitude">
              {(id) => (
                <Input
                  id={id}
                  inputMode="decimal"
                  className="font-mono"
                  value={getValue("officeLongitude")}
                  onChange={(e) => setField("officeLongitude", e.target.value)}
                />
              )}
            </F>
            <F label="Office radius (meters)">{num("officeRadiusMeters")}</F>
          </Section>
        </TabsContent>

        <TabsContent value="attendance" className="mt-5 space-y-5">
          <Section title="Shift" description="When the working day starts and ends" icon={Clock}>
            <F label="Office start time">{text("officeStartTime", "time")}</F>
            <F
              label="Office end time"
              hint="Shifts that end after midnight count toward the start day."
            >
              {text("officeEndTime", "time")}
            </F>
            <F
              label="Office span (hours)"
              hint="Maximum time counted between check-in and check-out."
            >
              {num("officeSpanHours")}
            </F>
            <div className="flex items-center gap-2 rounded-md border bg-subtle px-3 py-2.5 text-[13px] font-medium sm:col-span-2">
              <Clock className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="tabular-nums">{shiftSummary}</span>
            </div>
          </Section>

          <Section title="Working hours & breaks" icon={Coffee} tone="warning">
            <F label="Required working hours" hint="Hours an employee must work each day.">
              {num("requiredHours")}
            </F>
            <F
              label="Break cap (hours)"
              hint="Break time beyond this is deducted from working hours."
            >
              {num("breakHours")}
            </F>
          </Section>

          <Section
            title="Deficit rules"
            description="Short working hours"
            icon={AlertTriangle}
            tone="danger"
          >
            <F
              label="Half-day deficit (hours)"
              hint="Working this many hours short counts as half a day."
            >
              {num("deficitHalfDayHours")}
            </F>
            <F
              label="Full-day deficit (hours)"
              hint="Working this many hours short counts as a full day."
            >
              {num("deficitFullDayHours")}
            </F>
          </Section>

          <Section title="Late rules" description="Late arrivals" icon={Timer} tone="violet">
            <F
              label="Grace period (minutes)"
              hint="Arrivals within this window aren't marked late."
            >
              {num("graceMinutes")}
            </F>
            <div className="hidden sm:block" />
            <F label="Lates for a half day" hint="This many late arrivals count as half a day.">
              {num("lateHalfDayCount")}
            </F>
            <F label="Lates for a full day" hint="This many late arrivals count as a full day.">
              {num("lateFullDayCount")}
            </F>
          </Section>

          <div className="rounded-2xl border bg-card px-5 py-4">
            <ToggleRow
              title="Geofencing"
              description={`Only allow check-in within the office radius (${getValue("officeRadiusMeters")} m).`}
              checked={getBoolean("geofencingEnabled")}
              onCheckedChange={(v) => setField("geofencingEnabled", v)}
            />
          </div>
        </TabsContent>

        <TabsContent value="leave" className="mt-5">
          <Section title="Leave settings" icon={CalendarDays} tone="violet">
            <F label="Annual leave">{num("annualLeave")}</F>
            <F label="Casual leave">{num("casualLeave")}</F>
            <F label="Sick leave" className="sm:col-span-2">
              {num("sickLeave")}
            </F>
          </Section>
        </TabsContent>

        <TabsContent value="payroll" className="mt-5">
          <Section title="Payroll settings" icon={Wallet} tone="success">
            <F label="Pay cycle">{text("payCycle")}</F>
            <F label="Pay day">{num("payDay")}</F>
            <F
              label="Working days per month"
              className="sm:col-span-2"
              hint="One day of salary is the monthly gross divided by this number, so it sets what a late or deficit deduction costs. 26 treats the month as a six-day week; September itself had 22 working days."
            >
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  inputMode="numeric"
                  className="font-mono"
                  min={1}
                  max={31}
                  value={getValue("workingDaysPerMonth")}
                  onChange={(e) =>
                    // Zero would make a day of salary worth nothing and silently
                    // wipe out every deduction, so never store it.
                    setField("workingDaysPerMonth", Math.max(1, Number(e.target.value) || 26))
                  }
                />
              )}
            </F>
          </Section>
        </TabsContent>

        <TabsContent value="holidays" className="mt-5">
          <ChartCard title="Holiday settings" icon={PartyPopper} bodyClassName="">
            <div className="divide-y divide-divider pb-1 [&>*]:py-4 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
              <ToggleRow
                title="Saturday off"
                description="Saturday is normally off unless special working day exists."
                checked={getBoolean("saturdayOff")}
                onCheckedChange={(v) => setField("saturdayOff", v)}
              />
              <ToggleRow
                title="Sunday off"
                description="Sunday is normally off unless special working day exists."
                checked={getBoolean("sundayOff")}
                onCheckedChange={(v) => setField("sundayOff", v)}
              />
            </div>
          </ChartCard>
        </TabsContent>
      </Tabs>

      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
        {message && (
          <p
            role="status"
            className="mr-auto flex items-center gap-1.5 text-[13px] text-success-ink"
          >
            <CircleCheck className="size-3.5" />
            {message}
          </p>
        )}
        {mutation.error && (
          <p role="alert" className="mr-auto flex items-center gap-1.5 text-[13px] text-danger-ink">
            <AlertTriangle className="size-3.5" />
            {mutation.error instanceof Error ? mutation.error.message : "Could not save settings."}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={discardChanges} disabled={mutation.isPending}>
            Discard changes
          </Button>
          <Button onClick={handleSave} disabled={mutation.isPending}>
            {mutation.isPending ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
