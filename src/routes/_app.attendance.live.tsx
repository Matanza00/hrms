import { createFileRoute } from "@tanstack/react-router";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Coffee,
  LogIn,
  LogOut,
  AlertTriangle,
} from "lucide-react";
import { useAttendance } from "@/hooks/useAttendance";
import { currentBusinessDate, isCurrentShift } from "@/lib/businessDate";

export const Route = createFileRoute("/_app/attendance/live")({
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

function isLate(value: boolean | string | undefined) {
  return value === true || value === "TRUE";
}

function Column({
  title,
  icon: Icon,
  color,
  items,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  items: LiveItem[];
}) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className={`grid h-8 w-8 place-items-center rounded-lg ${color}`}>
          <Icon className="h-4 w-4" />
        </div>

        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">
            {items.length} employees
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
          No employees
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((i, idx) => (
            <li
              key={`${i.name}-${idx}`}
              className="relative flex items-start gap-3 pl-4 before:absolute before:left-1 before:top-2 before:h-1.5 before:w-1.5 before:rounded-full before:bg-accent"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-[10px] bg-muted">
                  {initials(i.name)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{i.name}</p>
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

  if (isLoading) {
    return (
      <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
        Loading live attendance...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error instanceof Error ? error.message : "Something went wrong"}
      </div>
    );
  }

  // Live monitoring is a view of TODAY's shift only. Without this filter the
  // same person shows up once per past day (e.g. Faraz in "Checked Out" again
  // and again). The (employee, business-date) pair is unique, so this leaves at
  // most one row per employee.
  const today = currentBusinessDate();
  const todays = attendanceRecords.filter((a) =>
    isCurrentShift(a.attendanceDate || a.checkIn, today),
  );

  const todayLabel = new Date(`${today}T00:00:00`).toLocaleDateString("en-PK", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const checkedIn = todays
    .filter((a) => a.checkIn && !a.checkOut && !a.breakStart)
    .map((a) => ({
      name: a.employeeName || a.employeeId,
      time: `In at ${formatTime(a.checkIn)}`,
      meta:
        a.latitude && a.longitude
          ? `${a.latitude}, ${a.longitude}`
          : undefined,
    }));

  const onBreak = todays
    .filter((a) => a.checkIn && !a.checkOut && a.breakStart && !a.breakEnd)
    .map((a) => ({
      name: a.employeeName || a.employeeId,
      time: `Break started ${formatTime(a.breakStart)}`,
      meta: a.breakMinutes ? `${a.breakMinutes} min` : undefined,
    }));

  const checkedOut = todays
    .filter((a) => a.checkOut)
    .map((a) => ({
      name: a.employeeName || a.employeeId,
      time: `Out at ${formatTime(a.checkOut)}`,
      meta: a.attendanceStatus,
    }));

  const late = todays
    .filter((a) => isLate(a.isLate))
    .map((a) => ({
      name: a.employeeName || a.employeeId,
      time: `Late · ${formatTime(a.checkIn)}`,
      meta: a.lateMinutes ? `${a.lateMinutes} min` : undefined,
    }));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[oklch(0.7_0.18_152)] opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[oklch(0.5_0.18_152)]" />
        </span>
        <h3 className="text-sm font-semibold">Today&rsquo;s shift</h3>
        <span className="text-xs text-muted-foreground">· {todayLabel}</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Column
        title="Checked In"
        icon={LogIn}
        color="bg-[oklch(0.7_0.18_152/0.15)] text-[oklch(0.5_0.18_152)]"
        items={checkedIn}
      />

      <Column
        title="On Break"
        icon={Coffee}
        color="bg-[oklch(0.78_0.16_75/0.18)] text-[oklch(0.55_0.16_75)]"
        items={onBreak}
      />

      <Column
        title="Checked Out"
        icon={LogOut}
        color="bg-muted text-foreground"
        items={checkedOut}
      />

      <Column
        title="Late Arrivals"
        icon={AlertTriangle}
        color="bg-[oklch(0.62_0.23_27/0.12)] text-[oklch(0.55_0.23_27)]"
        items={late}
      />
      </div>
    </div>
  );
}