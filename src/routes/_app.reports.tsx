import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
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

export const Route = createFileRoute("/_app/reports")({
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
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
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
    desc: "Partner shares, net profit, reserve and distribution summary.",
    icon: BarChart3,
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
        title="Reports"
        description="Central reporting hub for HRMS, payroll and accounts."
      />

      <div className="mb-5 rounded-2xl border bg-card shadow-xs p-5">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent">
            <FileText className="h-4.5 w-4.5" />
          </div>

          <div>
            <h3 className="text-sm font-semibold">Report Center</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Open any module, or download it as a PDF. Each report pulls live
              data from the Supabase backend at the moment you download it.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {reports.map((r) => (
          <div
            key={r.title}
            className="group flex flex-col rounded-2xl border bg-card p-5 transition hover:shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent">
                <r.icon className="h-4.5 w-4.5" />
              </div>

              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {r.module}
              </span>
            </div>

            <h3 className="mt-4 text-sm font-semibold">{r.title}</h3>
            <p className="mt-1 min-h-10 text-xs text-muted-foreground">
              {r.desc}
            </p>

            <div className="mt-4 flex items-center justify-between gap-2">
              <Button
                size="sm"
                className="h-8"
                disabled={busy === r.title}
                onClick={() => download(r)}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                {busy === r.title ? "Preparing…" : "Download PDF"}
              </Button>

              <Link
                to={r.href}
                className="flex items-center gap-1 text-xs font-medium text-accent"
              >
                Open
                <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
