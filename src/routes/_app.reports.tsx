import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toneInk, type Tone } from "@/lib/tones";
import {
  BarChart3,
  Users,
  Clock,
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  CalendarDays,
  FileText,
  ArrowRight,
  Download,
  ChartPie,
  type LucideIcon,
} from "lucide-react";
import {
  openPrintableReport,
  formatPKR,
  formatReportDate,
} from "@/lib/reportPdf";
import { getAttendance } from "@/lib/api/attendance";
import { getPayroll } from "@/lib/api/payroll";
import { getLeaveRequests } from "@/lib/api/leaves";
import {
  getAccountsOverview,
  getExpenses,
  getReserveLedger,
  getRevenue,
} from "@/lib/api/accounts";
import { getEmployees } from "@/lib/api/employees";

// Soft icon tile backgrounds (tint + ink) per report tone.
const tileTint: Record<Tone, string> = {
  neutral: "bg-muted",
  info: "bg-info-tint",
  success: "bg-success-tint",
  warning: "bg-warning-tint",
  danger: "bg-danger-tint",
  violet: "bg-violet-tint",
};

export const Route = createFileRoute("/_app/reports")({
  head: () => ({ meta: [{ title: "Reports — LDS HRMS" }] }),
  component: ReportsPage,
});

function timeFmt(v?: string) {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? String(v)
    : d.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function truthy(v: unknown) {
  return v === true || v === "TRUE" || v === "true";
}

type ReportDef = {
  title: string;
  tone: Tone;
  desc: string;
  icon: LucideIcon;
  href: string;
  module: string;
  build: () => Promise<{
    subtitle: string;
    columns: string[];
    rows: (string | number)[][];
    numericCols?: number[];
  }>;
};

const reports: ReportDef[] = [
  {
    title: "Attendance Report",
    tone: "info",
    desc: "Monthly attendance with check-ins, check-outs, deficits and lates.",
    icon: Clock,
    href: "/attendance",
    module: "HRMS",
    build: async () => {
      const rows = await getAttendance();
      return {
        subtitle: "Attendance records",
        columns: ["Date", "Employee", "Check In", "Check Out", "Status", "Late"],
        rows: rows.map((r) => [
          formatReportDate(r.attendanceDate || r.checkIn),
          r.employeeName || r.employeeId,
          timeFmt(r.checkIn),
          timeFmt(r.checkOut),
          r.attendanceStatus || "—",
          truthy(r.isLate) ? `${r.lateMinutes || 0} min` : "No",
        ]),
      };
    },
  },
  {
    title: "Payroll Report",
    tone: "success",
    desc: "Gross salary, allowances, deductions, bonus and net salary.",
    icon: Wallet,
    href: "/payroll",
    module: "Payroll",
    build: async () => {
      const rows = await getPayroll();
      return {
        subtitle: "Payroll records",
        columns: ["Employee", "Month", "Gross", "Deductions", "Bonus", "Net", "Status"],
        numericCols: [2, 3, 4, 5],
        rows: rows.map((r) => [
          r.employeeName || r.employeeId,
          String(r.month).slice(0, 7),
          formatPKR(r.grossSalary),
          formatPKR(r.deductionAmount),
          formatPKR(r.bonus),
          formatPKR(r.netSalary),
          r.status,
        ]),
      };
    },
  },
  {
    title: "Leave Report",
    tone: "violet",
    desc: "Paid leave, unpaid leave, approvals and rejected requests.",
    icon: CalendarDays,
    href: "/leaves",
    module: "HRMS",
    build: async () => {
      const rows = await getLeaveRequests();
      return {
        subtitle: "Leave requests",
        columns: ["Employee", "Type", "Start", "End", "Days", "Status"],
        numericCols: [4],
        rows: rows.map((r) => [
          r.employeeName || r.employeeId,
          r.leaveType,
          formatReportDate(r.startDate),
          formatReportDate(r.endDate),
          Number(r.totalDays || 0),
          r.status,
        ]),
      };
    },
  },
  {
    title: "Revenue Report",
    tone: "success",
    desc: "Revenue entries by date, client, source and month.",
    icon: TrendingUp,
    href: "/accounts/revenue",
    module: "Accounts",
    build: async () => {
      const rows = await getRevenue();
      return {
        subtitle: "Revenue entries",
        columns: ["Date", "Client", "Source", "Amount", "Status"],
        numericCols: [3],
        rows: rows.map((r) => [
          formatReportDate(r.revenueDate),
          r.client || "—",
          r.source || r.category || "—",
          formatPKR(r.amount),
          r.status || "Pending",
        ]),
      };
    },
  },
  {
    title: "Expense Report",
    tone: "warning",
    desc: "Expenses by category, amount and reserve usage.",
    icon: TrendingDown,
    href: "/accounts/expenses",
    module: "Accounts",
    build: async () => {
      const rows = await getExpenses();
      return {
        subtitle: "Expense entries",
        columns: ["Date", "Category", "Description", "Amount"],
        numericCols: [3],
        rows: rows.map((r) => [
          formatReportDate(r.expenseDate),
          r.category || "—",
          r.description || "—",
          formatPKR(r.amount),
        ]),
      };
    },
  },
  {
    title: "Profit Distribution",
    tone: "info",
    desc: "Partner shares, net profit, reserve and distribution summary.",
    icon: ChartPie,
    href: "/accounts/profit-distribution",
    module: "Accounts",
    build: async () => {
      const overview = await getAccountsOverview();
      return {
        subtitle: `Net profit · ${formatPKR(overview.summary.netProfit)}`,
        columns: ["Share", "Percent", "Amount"],
        numericCols: [1, 2],
        rows: (overview.distribution ?? []).map((d) => [
          d.name,
          `${d.percent}%`,
          formatPKR(d.amount),
        ]),
      };
    },
  },
  {
    title: "Reserve Report",
    tone: "violet",
    desc: "Reserve ledger, withdrawals and running balance movement.",
    icon: PiggyBank,
    href: "/accounts/reserve",
    module: "Accounts",
    build: async () => {
      const rows = await getReserveLedger();
      return {
        subtitle: "Reserve ledger",
        columns: ["Date", "Type", "Amount", "Balance After", "Description"],
        numericCols: [2, 3],
        rows: rows.map((r) => [
          formatReportDate(r.transactionDate),
          r.transactionType,
          formatPKR(r.amount),
          formatPKR(r.balanceAfter),
          r.description || "—",
        ]),
      };
    },
  },
  {
    title: "Workforce Report",
    tone: "neutral",
    desc: "Employees, departments, designations and employment status.",
    icon: Users,
    href: "/employees",
    module: "Employees",
    build: async () => {
      const rows = await getEmployees();
      return {
        subtitle: "Employee directory",
        columns: ["Code", "Name", "Department", "Designation", "Type", "Active"],
        rows: rows.map((e) => [
          e.employeeCode,
          e.name,
          e.department || "—",
          e.designation || "—",
          e.status || "—",
          truthy(e.active) ? "Yes" : "No",
        ]),
      };
    },
  },
];

function ReportsPage() {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function download(r: ReportDef) {
    try {
      setError("");
      setBusy(r.title);
      const { subtitle, columns, rows, numericCols } = await r.build();
      openPrintableReport({ title: r.title, subtitle, columns, rows, numericCols });
    } catch (err) {
      setError(
        `${r.title}: ${err instanceof Error ? err.message : "Failed to build report"}`,
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <PageHeader
        icon={BarChart3}
        title="Reports"
        description="Central reporting hub for HRMS, payroll and accounts."
      />

      <div className="mb-4 rounded-2xl border bg-card px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-text-secondary">
            <FileText className="size-[18px]" />
          </div>

          <div className="min-w-0">
            <h3 className="text-sm font-semibold leading-5 tracking-[-0.2px]">Report Center</h3>
            <p className="text-[13px] leading-[18px] text-muted-foreground">
              Open any module, or download it as a PDF. Each report pulls live data from the
              Supabase backend at the moment you download it.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-danger-line bg-danger-tint px-3 py-2 text-[13px] text-danger-ink"
        >
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {reports.map((r) => (
          <div
            key={r.title}
            className="group flex flex-col rounded-2xl border bg-card p-5 transition-colors hover:bg-subtle"
          >
            <div className="flex items-start justify-between gap-3">
              <div
                className={cn(
                  "grid size-8 place-items-center rounded-md",
                  tileTint[r.tone],
                  toneInk[r.tone],
                )}
              >
                <r.icon className="size-4" />
              </div>

              <span className="inline-flex h-[22px] items-center gap-1.5 rounded-sm border bg-subtle px-2 text-xs font-medium text-text-secondary">
                <span className="size-1.5 rounded-full bg-current" />
                {r.module}
              </span>
            </div>

            <h3 className="mt-4 text-sm font-semibold leading-5 tracking-[-0.2px]">{r.title}</h3>
            <p className="mt-1 min-h-9 text-[13px] leading-[18px] text-muted-foreground">
              {r.desc}
            </p>

            <div className="mt-auto flex items-center justify-between gap-2 pt-4">
              <Button size="sm" disabled={busy === r.title} onClick={() => download(r)}>
                <Download />
                {busy === r.title ? "Preparing…" : "Download PDF"}
              </Button>

              <Link
                to={r.href}
                className="flex items-center gap-1 text-[13px] font-medium text-foreground"
              >
                Open
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
