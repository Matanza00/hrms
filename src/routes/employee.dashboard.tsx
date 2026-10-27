import { createFileRoute } from "@tanstack/react-router";
import {
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  Clock,
  Hourglass,
  Info,
  LayoutDashboard,
  PartyPopper,
  Timer,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { ChartCard } from "@/components/shared/ChartCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAuth } from "@/lib/auth/AuthContext";
import { useEmployeeStats } from "@/hooks/useEmployeeStats";
import type { Holiday } from "@/lib/api/holidays";
import { toneSolid, type Tone } from "@/lib/tones";

export const Route = createFileRoute("/employee/dashboard")({
  head: () => ({ meta: [{ title: "My Dashboard — LDS HRMS" }] }),
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

// Progress fills cycle through the accent solids, one per leave type.
const barTones: Tone[] = ["info", "success", "warning", "violet", "danger"];

function EmployeeDashboard() {
  const { employeeId, employee, user } = useAuth();
  const stats = useEmployeeStats(employeeId);

  const name = employee?.name || user?.username || "there";
  const { leaves, hours, holidays } = stats;

  return (
    <div className="space-y-5">
      <PageHeader
        icon={LayoutDashboard}
        title={`Welcome back, ${name.split(" ")[0]}`}
        description="Here's your leave balance, working hours and what's coming up."
      />

      {/* KPI strip. Three across at most: six across truncates the labels
          to "Remainin…" and the card stops saying anything. */}
      <div className="metric-strip grid grid-cols-2 md:grid-cols-3">
        <StatCard
          label="Remaining leaves"
          value={stats.isLoading ? "…" : leaves.remaining}
          hint={`of ${leaves.entitlement} days`}
          icon={CalendarCheck}
          tone="success"
        />
        <StatCard
          label="Leaves taken"
          value={stats.isLoading ? "…" : leaves.taken}
          hint={leaves.pending ? `${leaves.pending} pending` : "approved days"}
          icon={CalendarClock}
          tone="accent"
        />
        <StatCard
          label="Total leaves"
          value={stats.isLoading ? "…" : leaves.entitlement}
          hint="annual entitlement"
          icon={CalendarDays}
        />
        <StatCard
          label="Hours this month"
          value={stats.isLoading ? "…" : `${hours.monthWorked}h`}
          hint={`of ${hours.monthTarget}h target`}
          icon={Clock}
          tone="accent"
        />
        <StatCard
          label="Remaining hours"
          value={stats.isLoading ? "…" : `${hours.remaining}h`}
          hint="to hit monthly target"
          icon={Hourglass}
          tone="warning"
        />
        <StatCard
          label="Next holiday"
          value={
            stats.isLoading ? "…" : holidays.next ? whenLabel(holidays.next.holidayDate) : "None"
          }
          hint={holidays.next ? holidays.next.title : "nothing scheduled"}
          icon={PartyPopper}
          tone="success"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Leave breakdown by type */}
        <ChartCard
          title="Leave balance"
          description="Days used against each quota"
          icon={CalendarDays}
          bodyClassName=""
        >
          <div className="space-y-4 pb-1">
            {leaves.byType.map((t, i) => {
              const pct = t.quota > 0 ? Math.min(100, (t.taken / t.quota) * 100) : 0;
              return (
                <div key={t.type} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[13px] font-medium">{t.type}</span>
                    <span className="font-mono text-[13px] font-medium">
                      {t.remaining} left{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        ({t.taken}/{t.quota})
                      </span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-divider">
                    <div
                      className={`h-full rounded-full ${toneSolid[barTones[i % barTones.length]]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {leaves.pending > 0 && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Info className="size-3.5 shrink-0" />
                <span>
                  You have{" "}
                  <span className="font-mono font-medium text-foreground">{leaves.pending}</span>{" "}
                  day(s) of leave pending approval.
                </span>
              </p>
            )}
          </div>
        </ChartCard>

        {/* Hours + upcoming holidays */}
        <div className="space-y-4">
          <ChartCard
            title="This month's hours"
            description="Worked against your monthly target"
            icon={Timer}
            tone="warning"
            bodyClassName=""
          >
            <div className="grid grid-cols-3 overflow-hidden rounded-lg border">
              {[
                { label: "Worked", value: hours.monthWorked },
                { label: "Target", value: hours.monthTarget },
                { label: "Remaining", value: hours.remaining },
              ].map((c) => (
                <div key={c.label} className="border-r border-divider px-3 py-3 last:border-r-0">
                  <p className="text-xs text-muted-foreground">{c.label}</p>
                  <p className="font-mono text-lg font-medium tracking-[-0.4px]">{c.value}h</p>
                </div>
              ))}
            </div>
            {/* Netted over the month, so extra hours on a long day cover a
                short one. Being ahead is worth saying out loud. */}
            {hours.deficit > 0 ? (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Info className="size-3.5 shrink-0" />
                <span>
                  Short by{" "}
                  <span className="font-mono font-medium text-danger-ink">{hours.deficit}h</span>{" "}
                  against the days worked so far this month.
                </span>
              </p>
            ) : hours.surplus > 0 ? (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Info className="size-3.5 shrink-0" />
                <span>
                  Ahead by{" "}
                  <span className="font-mono font-medium text-success-ink">{hours.surplus}h</span>{" "}
                  against the days worked so far this month.
                </span>
              </p>
            ) : null}
          </ChartCard>

          <ChartCard
            title="Upcoming holidays"
            description="Office closures ahead"
            icon={PartyPopper}
            tone="success"
            bodyClassName=""
          >
            {stats.isLoading ? (
              <p className="text-[13px] text-muted-foreground">Loading…</p>
            ) : holidays.upcoming.length === 0 ? (
              <EmptyState icon={PartyPopper} title="No upcoming holidays." />
            ) : (
              <ul className="-mx-5 -mt-5 -mb-4">
                {holidays.upcoming.slice(0, 5).map((h: Holiday) => (
                  <li
                    key={h.holidayId}
                    className="flex items-center justify-between gap-3 border-b border-divider px-5 py-3 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{h.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(h.holidayDate)} · {h.holidayType}
                      </p>
                    </div>
                    <span className="inline-flex h-[22px] shrink-0 items-center rounded-sm border bg-subtle px-2 font-mono text-[11px] font-medium text-text-secondary">
                      {whenLabel(h.holidayDate)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
