import { createFileRoute } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { Coffee, LogIn, LogOut, TriangleAlert } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { IconTile } from "@/components/shared/IconTile";
import type { Tone } from "@/lib/tones";
import { useAttendance } from "@/hooks/useAttendance";
import { useCurrentBusinessDate } from "@/hooks/useBusinessDate";
import { isCurrentShift } from "@/lib/businessDate";

export const Route = createFileRoute("/_app/attendance/live")({
  head: () => ({ meta: [{ title: "Live Monitoring — LDS HRMS" }] }),
  component: Live,
});

type LiveItem = {
  name: string;
  time: string;
  meta?: string;
};

function initials(name?: string) {
  if (!name) return "NA";

  return name
    .split(" ")
    .filter(Boolean)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatTime(value?: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleTimeString("en-PK", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "Friday, 16 October 2026" for a yyyy-mm-dd business date. */
function formatShiftDay(businessDate: string) {
  const date = new Date(`${businessDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return businessDate;
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function isLate(value: boolean | string | undefined) {
  return value === true || value === "TRUE";
}

function Column({
  title,
  icon,
  tone,
  tileClassName,
  items,
}: {
  title: string;
  icon: LucideIcon;
  tone: Tone;
  tileClassName?: string;
  items: LiveItem[];
}) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <IconTile icon={icon} tone={tone} className={tileClassName} />
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold leading-5 tracking-[-0.2px]">{title}</h3>
          <p className="text-xs text-muted-foreground">
            <span className="font-mono">{items.length}</span>{" "}
            {items.length === 1 ? "employee" : "employees"}
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-5 text-center text-[13px] leading-[18px] text-muted-foreground">
          No employees
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((i, idx) => (
            <li key={`${i.name}-${idx}`} className="flex items-start gap-3 pl-4">
              <Avatar className="size-8">
                <AvatarFallback className="bg-muted text-[11px] text-text-secondary">
                  {initials(i.name)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{i.name}</p>
                <p className="text-xs text-muted-foreground">
                  {i.time}
                  {i.meta ? ` · ${i.meta}` : ""}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Live() {
  const { data: attendanceRecords = [], isLoading, error } = useAttendance();
  const businessDate = useCurrentBusinessDate();

  if (isLoading) {
    return (
      <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
        Loading live attendance...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-danger-line bg-danger-tint p-4 text-[13px] text-danger-ink">
        {error instanceof Error ? error.message : "Something went wrong"}
      </div>
    );
  }

  // Live view = the current shift only. Older rows without a check-out would
  // otherwise sit under "Checked In" forever.
  const today = attendanceRecords.filter((a) =>
    isCurrentShift(a.attendanceDate || a.checkIn, businessDate),
  );

  const checkedIn = today
    .filter((a) => a.checkIn && !a.checkOut && !a.breakStart)
    .map((a) => ({
      name: a.employeeName || a.employeeId,
      time: `In at ${formatTime(a.checkIn)}`,
      meta: a.latitude && a.longitude ? `${a.latitude}, ${a.longitude}` : undefined,
    }));

  const onBreak = today
    .filter((a) => a.checkIn && !a.checkOut && a.breakStart && !a.breakEnd)
    .map((a) => ({
      name: a.employeeName || a.employeeId,
      time: `Break started ${formatTime(a.breakStart)}`,
      meta: a.breakMinutes ? `${a.breakMinutes} min` : undefined,
    }));

  const checkedOut = today
    .filter((a) => a.checkOut)
    .slice(0, 8)
    .map((a) => ({
      name: a.employeeName || a.employeeId,
      time: `Out at ${formatTime(a.checkOut)}`,
      meta: a.attendanceStatus,
    }));

  const late = today
    .filter((a) => isLate(a.isLate))
    .map((a) => ({
      name: a.employeeName || a.employeeId,
      time: `Late · ${formatTime(a.checkIn)}`,
      meta: a.lateMinutes ? `${a.lateMinutes} min` : undefined,
    }));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="relative grid size-2.5 place-items-center rounded-full bg-success-line">
          <span className="size-1.5 rounded-full bg-success" />
        </span>
        <h3 className="text-sm font-semibold leading-5 tracking-[-0.2px]">Today&apos;s shift</h3>
        <span className="text-xs text-muted-foreground">· {formatShiftDay(businessDate)}</span>
      </div>

      <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Column title="Checked In" icon={LogIn} tone="success" items={checkedIn} />

        <Column title="On Break" icon={Coffee} tone="warning" items={onBreak} />

        <Column
          title="Checked Out"
          icon={LogOut}
          tone="neutral"
          tileClassName="bg-muted-foreground text-card"
          items={checkedOut}
        />

        <Column title="Late Arrivals" icon={TriangleAlert} tone="danger" items={late} />
      </div>
    </div>
  );
}
