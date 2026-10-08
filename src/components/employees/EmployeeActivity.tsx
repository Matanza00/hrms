import { useQuery } from "@tanstack/react-query";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { getAttendance, type AttendanceRecord } from "@/lib/api/attendance";
import { getLeaveRequests, type LeaveRequest } from "@/lib/api/leaves";
import { getPayroll, type PayrollRecord } from "@/lib/api/payroll";

function formatPKR(value: number | string | undefined) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? String(value)
    : d.toLocaleDateString("en-PK", { year: "numeric", month: "short", day: "numeric" });
}

function formatTime(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? String(value)
    : d.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function formatMonth(value?: string) {
  if (!value) return "—";
  const d = new Date(`${String(value).slice(0, 7)}-01`);
  return Number.isNaN(d.getTime())
    ? String(value)
    : d.toLocaleDateString("en-PK", { month: "short", year: "numeric" });
}

function truthy(v: unknown) {
  return v === true || v === "TRUE" || v === "true";
}

const box = "rounded-2xl border bg-card p-6 text-sm text-muted-foreground";

/**
 * The attendance / leaves / payroll history for a single employee, pulled from
 * the same admin endpoints the module pages use and filtered to this person.
 */
export function EmployeeActivity({
  kind,
  employeeId,
}: {
  kind: "attendance" | "leaves" | "payroll";
  employeeId: string;
}) {
  const query = useQuery<
    AttendanceRecord[] | LeaveRequest[] | PayrollRecord[]
  >({
    queryKey: [kind],
    queryFn: () =>
      kind === "attendance"
        ? getAttendance()
        : kind === "leaves"
          ? getLeaveRequests()
          : getPayroll(),
  });

  if (query.isLoading) return <div className={box}>Loading {kind}…</div>;
  if (query.error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {query.error instanceof Error ? query.error.message : "Something went wrong"}
      </div>
    );
  }

  if (kind === "attendance") {
    const rows = ((query.data as AttendanceRecord[]) ?? [])
      .filter((r) => r.employeeId === employeeId)
      .sort(
        (a, b) =>
          new Date(b.attendanceDate || b.checkIn || "").getTime() -
          new Date(a.attendanceDate || a.checkIn || "").getTime(),
      );
    return (
      <DataTable<AttendanceRecord>
        rowKey={(r) => r.attendanceId}
        data={rows}
        empty="No attendance records yet."
        columns={[
          { key: "date", header: "Date", render: (r) => formatDate(r.attendanceDate || r.checkIn) },
          { key: "in", header: "Check In", render: (r) => formatTime(r.checkIn) },
          { key: "out", header: "Check Out", render: (r) => formatTime(r.checkOut) },
          { key: "status", header: "Status", render: (r) => <StatusBadge status={r.attendanceStatus} /> },
          {
            key: "late",
            header: "Late",
            render: (r) => (truthy(r.isLate) ? `${r.lateMinutes || 0} min` : "No"),
          },
        ]}
      />
    );
  }

  if (kind === "leaves") {
    const rows = ((query.data as LeaveRequest[]) ?? [])
      .filter((r) => r.employeeId === employeeId)
      .sort(
        (a, b) => new Date(b.startDate || "").getTime() - new Date(a.startDate || "").getTime(),
      );
    return (
      <DataTable<LeaveRequest>
        rowKey={(r) => r.leaveId}
        data={rows}
        empty="No leave requests yet."
        columns={[
          { key: "type", header: "Type", render: (r) => r.leaveType },
          { key: "start", header: "From", render: (r) => formatDate(r.startDate) },
          { key: "end", header: "To", render: (r) => formatDate(r.endDate) },
          { key: "days", header: "Days", render: (r) => Number(r.totalDays || 0) },
          { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
        ]}
      />
    );
  }

  const rows = ((query.data as PayrollRecord[]) ?? [])
    .filter((r) => r.employeeId === employeeId)
    .sort((a, b) => String(b.month).localeCompare(String(a.month)));
  return (
    <DataTable<PayrollRecord>
      rowKey={(r) => r.payrollId}
      data={rows}
      empty="No payroll records yet."
      columns={[
        { key: "month", header: "Month", render: (r) => formatMonth(r.month) },
        { key: "gross", header: "Gross", render: (r) => formatPKR(r.grossSalary) },
        { key: "ded", header: "Deductions", render: (r) => formatPKR(r.deductionAmount) },
        { key: "net", header: "Net", render: (r) => formatPKR(r.netSalary) },
        { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
    />
  );
}
