import { createFileRoute } from "@tanstack/react-router";
import {
  CalendarCheck,
  CalendarClock,
  Clock,
  Hourglass,
  PartyPopper,
  Timer,
} from "lucide-react";
import { StatCard } from "@/components/shared/StatCard";
import { useAuth } from "@/lib/auth/AuthContext";
import { useEmployeeStats } from "@/hooks/useEmployeeStats";
import type { Holiday } from "@/lib/api/holidays";

export const Route = createFileRoute("/employee/dashboard")({
  component: EmployeeDashboard,
});

function daysUntil(dateStr: string) {
  const target = new Date(dateStr);
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((target.getTime() - startToday.getTime()) / 86400000);
  return diff;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime())
    ? dateStr
    : d.toLocaleDateString("en-PK", { weekday: "short", day: "numeric", month: "short" });
}

function whenLabel(dateStr: string) {
  const d = daysUntil(dateStr);
  if (d === null) return "";
  if (d === 0) return "Today";
  if (d === 1) return "Tomorrow";
  return `In ${d} days`;
}

function EmployeeDashboard() {
  const { employeeId, employee, user } = useAuth();
  const stats = useEmployeeStats(employeeId);

  const name = employee?.name || user?.username || "there";
  const { leaves, hours, holidays } = stats;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Welcome back, {name.split(" ")[0]} 👋
        </h1>
        <p className="text-muted-foreground text-sm">
          Here's your leave balance, working hours and what's coming up.
        </p>
      </div>

      {/* KPI grid */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Remaining Leaves"
          value={stats.isLoading ? "…" : leaves.remaining}
          hint={`of ${leaves.entitlement} days`}
          icon={CalendarCheck}
          tone="success"
        />
        <StatCard
          label="Leaves Taken"
          value={stats.isLoading ? "…" : leaves.taken}
          hint={leaves.pending ? `${leaves.pending} pending` : "approved days"}
          icon={CalendarClock}
          tone="accent"
        />
        <StatCard
          label="Total Leaves"
          value={stats.isLoading ? "…" : leaves.entitlement}
          hint="annual entitlement"
          icon={CalendarCheck}
        />
        <StatCard
          label="Hours This Month"
          value={stats.isLoading ? "…" : `${hours.monthWorked}h`}
          hint={`of ${hours.monthTarget}h target`}
          icon={Clock}
          tone="accent"
        />
        <StatCard
          label="Remaining Hours"
          value={stats.isLoading ? "…" : `${hours.remaining}h`}
          hint="to hit monthly target"
          icon={Hourglass}
          tone="warning"
        />
        <StatCard
          label="Next Holiday"
          value={
            stats.isLoading
              ? "…"
              : holidays.next
                ? whenLabel(holidays.next.holidayDate)
                : "None"
          }
          hint={holidays.next ? holidays.next.title : "nothing scheduled"}
          icon={PartyPopper}
          tone="success"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Leave breakdown by type */}
        <div className="rounded-2xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
            Leave Balance
          </h3>

          <div className="space-y-4">
            {leaves.byType.map((t) => {
              const pct = t.quota > 0 ? Math.min(100, (t.taken / t.quota) * 100) : 0;
              return (
                <div key={t.type} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{t.type}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {t.remaining} left{" "}
                      <span className="text-xs">
                        ({t.taken}/{t.quota})
                      </span>
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {leaves.pending > 0 && (
              <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                You have <span className="font-medium">{leaves.pending}</span> day(s) of
                leave pending approval.
              </p>
            )}
          </div>
        </div>

        {/* Hours + upcoming holidays */}
        <div className="space-y-4">
          <div className="rounded-2xl border bg-card p-5">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Timer className="h-4 w-4 text-muted-foreground" />
              This Month's Hours
            </h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl border bg-muted/30 p-3">
                <p className="text-lg font-semibold tabular-nums">{hours.monthWorked}h</p>
                <p className="text-[11px] text-muted-foreground">Worked</p>
              </div>
              <div className="rounded-xl border bg-muted/30 p-3">
                <p className="text-lg font-semibold tabular-nums">{hours.monthTarget}h</p>
                <p className="text-[11px] text-muted-foreground">Target</p>
              </div>
              <div className="rounded-xl border bg-muted/30 p-3">
                <p className="text-lg font-semibold tabular-nums">{hours.remaining}h</p>
                <p className="text-[11px] text-muted-foreground">Remaining</p>
              </div>
            </div>
            {hours.deficit > 0 && (
              <p className="mt-3 text-xs text-muted-foreground">
                Accumulated deficit this month:{" "}
                <span className="font-medium text-foreground">{hours.deficit}h</span>
              </p>
            )}
          </div>

          <div className="rounded-2xl border bg-card p-5">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <PartyPopper className="h-4 w-4 text-muted-foreground" />
              Upcoming Holidays
            </h3>
            {stats.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : holidays.upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming holidays.</p>
            ) : (
              <ul className="space-y-2">
                {holidays.upcoming.slice(0, 5).map((h: Holiday) => (
                  <li
                    key={h.holidayId}
                    className="flex items-center justify-between rounded-xl border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{h.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(h.holidayDate)} · {h.holidayType}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">
                      {whenLabel(h.holidayDate)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
