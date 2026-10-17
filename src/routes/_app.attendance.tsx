import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UserCheck,
  UserX,
  Clock,
  TriangleAlert,
  Activity,
  Download,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { useAttendance } from "@/hooks/useAttendance";
import { deleteAttendance, type AttendanceRecord } from "@/lib/api/attendance";
import { useEmployees } from "@/hooks/useEmployees";
import { AttendanceEditDialog } from "@/components/attendance/AttendanceEditDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getHolidays } from "@/lib/api/holidays";
import { getSettings } from "@/lib/api/settings";
import { currentBusinessMonth } from "@/lib/businessDate";
import { dayBalanceMinutes, formatHoursMinutes, monthlyHoursBalance } from "@/lib/hoursBalance";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/attendance")({
  head: () => ({ meta: [{ title: "Attendance — LDS HRMS" }] }),
  component: AttendanceLayout,
});

/** Rows per page in the records table. */
const PAGE_SIZE = 25;

/** A finished shift longer than this almost always means a missed check-out. */
const REVIEW_OVER_MINUTES = 16 * 60;

const RANGES = [
  { value: "all", label: "All time" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

/**
 * A day's balance against the requirement: "-2h" when short, "+1h 30m" when
 * over. The stored deficit is clamped at zero, so it would show a ten-hour day
 * as "0m" and hide the extra time that covers a short day elsewhere.
 */
function DayBalance({
  record,
  requiredPerDay,
}: {
  record: AttendanceRecord;
  requiredPerDay: number;
}) {
  const balance = dayBalanceMinutes(record, requiredPerDay);
  if (balance === null) return <span className="text-muted-foreground">—</span>;

  const amount = formatHoursMinutes(balance);
  if (balance < 0) return <span className="whitespace-nowrap text-danger-ink">-{amount}</span>;
  if (balance > 0)
    return <span className="whitespace-nowrap text-muted-foreground">+{amount}</span>;
  return <span className="text-muted-foreground">0m</span>;
}

/** "16-Oct-2026" */
function formatDate(value?: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date
    .toLocaleDateString("en-PK", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .replace(/[\s,]+/g, "-");
}

function formatTime(value?: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleTimeString("en-PK", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/** Millis for sorting; falls back to the check-in time when no date. */
function recordTime(r: AttendanceRecord) {
  const raw = r.attendanceDate || r.checkIn || "";
  const t = new Date(raw).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function isLate(value: AttendanceRecord["isLate"]) {
  return value === true || value === "TRUE";
}

/** Download every attendance record (newest first) as a CSV file. */
function exportAttendanceCsv(records: AttendanceRecord[]) {
  const header = [
    "Employee",
    "Date",
    "Check in",
    "Check out",
    "Break start",
    "Break end",
    "Worked (min)",
    "Late",
    "Status",
  ];
  const rows = [...records]
    .sort((a, b) => recordTime(b) - recordTime(a))
    .map((r) => [
      r.employeeName || r.employeeId,
      formatDate(r.attendanceDate),
      formatTime(r.checkIn),
      formatTime(r.checkOut),
      formatTime(r.breakStart),
      formatTime(r.breakEnd),
      r.workingMinutes ?? "",
      isLate(r.isLate) ? "Yes" : "No",
      r.attendanceStatus,
    ]);
  const csv = [header, ...rows]
    .map((row) => row.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `attendance-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function AttendanceLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { data: allRecords } = useAttendance();

  const tabs = [
    { url: "/attendance", label: "Overview" },
    { url: "/attendance/live", label: "Live Monitoring" },
    { url: "/attendance/corrections", label: "Corrections" },
    { url: "/attendance/qr", label: "QR & Devices" },
  ];

  const isRoot = path === "/attendance";

  return (
    <div>
      <PageHeader
        icon={Clock}
        title="Attendance"
        description="Monitor check-ins, breaks and working hours across the team."
        actions={
          <Button
            variant="outline"
            disabled={!Array.isArray(allRecords) || allRecords.length === 0}
            onClick={() => exportAttendanceCsv(Array.isArray(allRecords) ? allRecords : [])}
          >
            <Download />
            Export CSV
          </Button>
        }
      />

      {/* Section sub-nav: the Figma segmented "Tabs", as links. */}
      <nav
        aria-label="Attendance sections"
        className="mb-5 flex max-w-full gap-1 overflow-x-auto rounded-md bg-muted p-[3px] [-ms-overflow-style:none] [scrollbar-width:none] sm:inline-flex sm:gap-0 [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((t) => {
          const active = path === t.url;

          return (
            <Link
              key={t.url}
              to={t.url}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-[6px] px-3 py-1 text-[13px] font-medium leading-[18px] transition-colors sm:min-h-0 sm:py-1.5",
                active
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      {isRoot ? <AttendanceOverview /> : <Outlet />}
    </div>
  );
}

function AttendanceOverview() {
  const qc = useQueryClient();
  const { data: attendanceRecords = [], isLoading, error } = useAttendance();

  const deleteMutation = useMutation({
    mutationFn: deleteAttendance,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attendance"] }),
  });

  // Newest first — latest check-ins/check-outs at the top.
  const sortedRecords = [...attendanceRecords].sort((a, b) => recordTime(b) - recordTime(a));

  const { data: employeesRaw = [] } = useEmployees();

  const employees = Array.isArray(employeesRaw) ? employeesRaw : [];

  const { data: settings = {} } = useQuery({ queryKey: ["settings"], queryFn: getSettings });
  const { data: holidaysRaw = [] } = useQuery({ queryKey: ["holidays"], queryFn: getHolidays });
  const holidays = Array.isArray(holidaysRaw) ? holidaysRaw : [];

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AttendanceRecord | null>(null);

  const [search, setSearch] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [range, setRange] = useState("all");
  const [lateOnly, setLateOnly] = useState(false);
  const [page, setPage] = useState(0);

  function openEdit(record: AttendanceRecord) {
    setEditing(record);
    setDialogOpen(true);
  }

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function getEmployeeName(employeeId?: string) {
    const employee = employees.find((e) => e.employeeId === employeeId);

    return employee?.name || employeeId || "Unknown";
  }

  /** Any filter change goes back to the first page. */
  function filterSetter<T>(set: (v: T) => void) {
    return (v: T) => {
      set(v);
      setPage(0);
    };
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
        Loading attendance...
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-danger-line bg-danger-tint p-4 text-[13px] text-danger-ink"
      >
        {error instanceof Error ? error.message : "Something went wrong"}
      </div>
    );
  }

  const present = attendanceRecords.filter((r) => r.attendanceStatus === "Present").length;

  const absent = attendanceRecords.filter((r) => r.attendanceStatus === "Absent").length;

  const late = attendanceRecords.filter((r) => isLate(r.isLate)).length;

  const month = currentBusinessMonth();
  const requiredPerDay = Number(settings.requiredHours) || 8;

  const byEmployee = new Map<string, AttendanceRecord[]>();
  for (const r of attendanceRecords) {
    if (!byEmployee.has(r.employeeId)) byEmployee.set(r.employeeId, []);
    byEmployee.get(r.employeeId)!.push(r);
  }

  const monthDeficitHours = [...byEmployee.values()].reduce(
    (sum, records) =>
      sum +
      monthlyHoursBalance(records, { month, settings, holidays, requiredPerDay }).deficitHours,
    0,
  );

  const attendanceRate =
    attendanceRecords.length > 0 ? Math.round((present / attendanceRecords.length) * 100) : 0;

  const nameOf = (r: AttendanceRecord) => r.employeeName || getEmployeeName(r.employeeId);

  const statuses = [...new Set(attendanceRecords.map((r) => r.attendanceStatus).filter(Boolean))];

  const query = search.trim().toLowerCase();
  const since = range === "all" ? 0 : Date.now() - Number(range) * 86_400_000;

  const filtered = sortedRecords.filter(
    (r) =>
      (!query || nameOf(r).toLowerCase().includes(query)) &&
      (employeeFilter === "all" || r.employeeId === employeeFilter) &&
      (statusFilter === "all" || r.attendanceStatus === statusFilter) &&
      (!lateOnly || isLate(r.isLate)) &&
      (!since || recordTime(r) >= since),
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  const needsReview = sortedRecords.filter(
    (r) => r.checkOut && Number(r.workingMinutes) > REVIEW_OVER_MINUTES,
  );
  const firstReview = needsReview[0];

  return (
    <>
      <div className="metric-strip grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Present · all time" value={present} icon={UserCheck} tone="success" />
        <StatCard label="Absent · all time" value={absent} icon={UserX} tone="danger" />
        <StatCard label="Late · all time" value={late} icon={Clock} tone="warning" />
        <StatCard
          label="Deficit Hours (this month)"
          value={formatHoursMinutes(monthDeficitHours * 60)}
          icon={TriangleAlert}
          tone="warning"
        />
        <StatCard
          label="Attendance rate · all time"
          value={`${attendanceRate}%`}
          icon={Activity}
          tone="accent"
        />
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold leading-5 tracking-[-0.2px]">Records</h3>
        <Button variant="outline" onClick={openCreate}>
          <Plus />
          Add record
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-[260px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => filterSetter(setSearch)(e.target.value)}
            placeholder="Search employee…"
            aria-label="Search employee"
            className="pl-[34px]"
          />
        </div>

        <Select value={employeeFilter} onValueChange={filterSetter(setEmployeeFilter)}>
          <SelectTrigger className="w-[calc(50%-4px)] sm:w-40" aria-label="Employee">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All employees</SelectItem>
            {employees.map((e) => (
              <SelectItem key={e.employeeId} value={e.employeeId}>
                {e.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={filterSetter(setStatusFilter)}>
          <SelectTrigger className="w-[calc(50%-4px)] sm:w-40" aria-label="Status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {statuses.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={range} onValueChange={filterSetter(setRange)}>
          <SelectTrigger className="w-[calc(50%-4px)] sm:w-40" aria-label="Date range">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGES.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <button
          type="button"
          aria-pressed={lateOnly}
          onClick={() => filterSetter(setLateOnly)(!lateOnly)}
          className={cn(
            "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border px-3 text-[13px] font-medium leading-[18px] transition-colors",
            lateOnly
              ? "border-warning-line bg-warning-tint text-warning-ink"
              : "bg-card text-foreground hover:bg-muted",
          )}
        >
          <Clock className="size-3.5" />
          Late only
        </button>
      </div>

      {firstReview && (
        <div className="mt-3 flex flex-col gap-3 rounded-lg border border-warning-line bg-warning-tint px-3.5 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-2.5 sm:items-center">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning-ink sm:mt-0" />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold leading-[18px] text-warning-ink">
                {needsReview.length === 1
                  ? "1 record needs review"
                  : `${needsReview.length} records need review`}
              </p>
              <p className="mt-0.5 text-xs text-warning-ink">
                {nameOf(firstReview)} ·{" "}
                {formatDate(firstReview.attendanceDate || firstReview.checkIn)} shows{" "}
                {formatHoursMinutes(Number(firstReview.workingMinutes))} worked. The check-out was
                probably missed.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 self-start sm:self-auto"
            onClick={() => openEdit(firstReview)}
          >
            Review record
          </Button>
        </div>
      )}

      <div className="mt-3">
        <DataTable<AttendanceRecord>
          rowKey={(r) => r.attendanceId}
          data={pageRows}
          empty="No records match these filters."
          columns={[
            {
              key: "employee",
              header: "Employee",
              render: (r) => <span className="font-medium">{nameOf(r)}</span>,
            },
            {
              key: "attendanceDate",
              header: "Date",
              render: (r) => (
                <span className="whitespace-nowrap">
                  {formatDate(r.attendanceDate || r.checkIn)}
                </span>
              ),
            },
            {
              key: "checkIn",
              header: "Check In",
              render: (r) => <span className="whitespace-nowrap">{formatTime(r.checkIn)}</span>,
            },
            {
              key: "checkOut",
              header: "Check Out",
              render: (r) => <span className="whitespace-nowrap">{formatTime(r.checkOut)}</span>,
            },
            {
              key: "break",
              header: "Break",
              render: (r) => (
                <span className="whitespace-nowrap">
                  {r.breakStart || r.breakEnd
                    ? `${formatTime(r.breakStart)} – ${formatTime(r.breakEnd)}`
                    : "—"}
                </span>
              ),
            },
            {
              key: "workingMinutes",
              header: "Hours",
              render: (r) =>
                r.checkOut ? (
                  <span className="whitespace-nowrap">
                    {formatHoursMinutes(r.workingMinutes ?? 0)}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                ),
            },
            {
              key: "deficitMinutes",
              header: "Balance",
              render: (r) => <DayBalance record={r} requiredPerDay={requiredPerDay} />,
            },
            {
              key: "late",
              header: "Late",
              render: (r) =>
                isLate(r.isLate) ? (
                  <StatusBadge status="Late" />
                ) : (
                  <span className="text-muted-foreground">No</span>
                ),
            },
            {
              key: "status",
              header: "Status",
              render: (r) => <StatusBadge status={r.attendanceStatus} />,
            },
            {
              key: "location",
              header: "Location",
              hideOnMobile: true,
              render: (r) => (
                <span className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                  {r.latitude && r.longitude ? `${r.latitude}, ${r.longitude}` : "—"}
                </span>
              ),
            },
            {
              key: "ipAddress",
              header: "IP",
              hideOnMobile: true,
              // Not in the Figma table; only shown where there is room for it.
              className: "hidden 2xl:table-cell",
              render: (r) => (
                <span className="font-mono text-xs text-muted-foreground">
                  {r.ipAddress || "—"}
                </span>
              ),
            },
            {
              key: "actions",
              header: "",
              className: "text-right",
              render: (r) => (
                <div className="flex justify-end gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                    <Pencil />
                    Edit
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline" className="text-danger-ink">
                        <Trash2 />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete attendance record?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This permanently removes the {formatDate(r.attendanceDate || r.checkIn)}{" "}
                          record for {r.employeeName || getEmployeeName(r.employeeId)}. This cannot
                          be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteMutation.mutate(r.attendanceId)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ),
            },
          ]}
        />
      </div>

      {filtered.length > 0 && (
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Showing{" "}
            <span className="font-mono">
              {currentPage * PAGE_SIZE + 1}–{currentPage * PAGE_SIZE + pageRows.length}
            </span>{" "}
            of <span className="font-mono">{filtered.length}</span> records
          </p>
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              disabled={currentPage === 0}
              onClick={() => setPage(currentPage - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={currentPage >= pageCount - 1}
              onClick={() => setPage(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <AttendanceEditDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        record={editing}
        employees={employees}
      />
    </>
  );
}
