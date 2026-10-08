import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell, CalendarDays, Clock, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getLeaveRequests } from "@/lib/api/leaves";
import { getAttendanceCorrections } from "@/lib/api/attendance";

function formatDate(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-PK", { day: "numeric", month: "short" });
}

type Note = {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  detail: string;
  to: string;
};

/**
 * Top-nav notifications. Replaces the old bell-that-was-just-a-link with a real
 * dropdown of things needing attention: pending leave requests and pending
 * attendance corrections. Each item jumps to where it's actioned.
 */
export function NotificationBell() {
  const navigate = useNavigate();

  const { data: leavesRaw = [] } = useQuery({
    queryKey: ["leaveRequests"],
    queryFn: getLeaveRequests,
  });
  const { data: correctionsRaw = [] } = useQuery({
    queryKey: ["attendanceCorrections"],
    queryFn: getAttendanceCorrections,
  });

  const leaves = Array.isArray(leavesRaw) ? leavesRaw : [];
  const corrections = Array.isArray(correctionsRaw) ? correctionsRaw : [];

  const pendingLeaves = leaves.filter((l) => l.status === "Pending");
  const pendingCorrections = corrections.filter((c) => c.status === "Pending");

  const notes: Note[] = [
    ...pendingLeaves.map((l) => ({
      id: `leave-${l.leaveId}`,
      icon: CalendarDays,
      title: `${l.employeeName || "Employee"} · ${l.leaveType} leave`,
      detail: `${formatDate(l.startDate)} – ${formatDate(l.endDate)} · awaiting approval`,
      to: "/leaves",
    })),
    ...pendingCorrections.map((c) => ({
      id: `corr-${c.correctionId}`,
      icon: Clock,
      title: `${c.employeeName || "Employee"} · attendance correction`,
      detail: `${c.requestType || "Correction"} · ${formatDate(c.attendanceDate)} · awaiting review`,
      to: "/attendance/corrections",
    })),
  ];

  const count = notes.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 relative" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[oklch(0.62_0.23_27)] px-1 text-[9px] font-semibold text-white">
              {count}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {count > 0 && (
            <span className="text-xs font-normal text-muted-foreground">
              {count} pending
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {count === 0 ? (
          <div className="flex flex-col items-center gap-1.5 px-3 py-6 text-center">
            <CheckCheck className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">You&rsquo;re all caught up.</p>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {notes.slice(0, 12).map((n) => (
              <DropdownMenuItem
                key={n.id}
                className="flex items-start gap-2.5 py-2.5"
                onSelect={() => navigate({ to: n.to })}
              >
                <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-muted">
                  <n.icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{n.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{n.detail}</p>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate({ to: "/leaves" })}>
          <CalendarDays className="mr-2 h-4 w-4" />
          Review leave requests
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate({ to: "/attendance/corrections" })}>
          <Clock className="mr-2 h-4 w-4" />
          Review attendance corrections
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
