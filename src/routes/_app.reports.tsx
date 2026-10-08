import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/PageHeader";
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
} from "lucide-react";

export const Route = createFileRoute("/_app/reports")({
  component: ReportsPage,
});

const reports = [
  {
    title: "Attendance Report",
    desc: "Monthly attendance with check-ins, check-outs, deficits and lates.",
    icon: Clock,
    href: "/attendance",
    module: "HRMS",
  },
  {
    title: "Payroll Report",
    desc: "Gross salary, allowances, deductions, bonus and net salary.",
    icon: Wallet,
    href: "/payroll",
    module: "Payroll",
  },
  {
    title: "Leave Report",
    desc: "Paid leave, unpaid leave, approvals and rejected requests.",
    icon: CalendarDays,
    href: "/leaves",
    module: "HRMS",
  },
  {
    title: "Revenue Report",
    desc: "Revenue entries by date, client, source and month.",
    icon: TrendingUp,
    href: "/accounts/revenue",
    module: "Accounts",
  },
  {
    title: "Expense Report",
    desc: "Expenses by category, amount and reserve usage.",
    icon: TrendingDown,
    href: "/accounts/expenses",
    module: "Accounts",
  },
  {
    title: "Profit Distribution",
    desc: "Partner shares, net profit, reserve and distribution summary.",
    icon: BarChart3,
    href: "/accounts/profit-distribution",
    module: "Accounts",
  },
  {
    title: "Reserve Report",
    desc: "Reserve ledger, withdrawals and running balance movement.",
    icon: PiggyBank,
    href: "/accounts/reserve",
    module: "Accounts",
  },
  {
    title: "Workforce Report",
    desc: "Employees, departments, designations and employment status.",
    icon: Users,
    href: "/employees",
    module: "Employees",
  },
];

function ReportsPage() {
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
              Open any report below. Each report is connected to its live module
              data from the Apps Script + Google Sheets backend.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {reports.map((r) => (
          <Link
            key={r.title}
            to={r.href}
            className="group rounded-2xl border bg-card p-5 transition hover:shadow-sm hover:-translate-y-0.5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent group-hover:bg-accent group-hover:text-accent-foreground transition">
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

            <div className="mt-4 flex items-center gap-1 text-xs font-medium text-accent">
              Open report
              <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}