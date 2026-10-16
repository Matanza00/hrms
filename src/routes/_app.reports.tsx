import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/PageHeader";
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
  ChartPie,
} from "lucide-react";

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

const reports = [
  {
    title: "Attendance Report",
    tone: "info" as Tone,
    desc: "Monthly attendance with check-ins, check-outs, deficits and lates.",
    icon: Clock,
    href: "/attendance",
    module: "HRMS",
  },
  {
    title: "Payroll Report",
    tone: "success" as Tone,
    desc: "Gross salary, allowances, deductions, bonus and net salary.",
    icon: Wallet,
    href: "/payroll",
    module: "Payroll",
  },
  {
    title: "Leave Report",
    tone: "violet" as Tone,
    desc: "Paid leave, unpaid leave, approvals and rejected requests.",
    icon: CalendarDays,
    href: "/leaves",
    module: "HRMS",
  },
  {
    title: "Revenue Report",
    tone: "success" as Tone,
    desc: "Revenue entries by date, client, source and month.",
    icon: TrendingUp,
    href: "/accounts/revenue",
    module: "Accounts",
  },
  {
    title: "Expense Report",
    tone: "warning" as Tone,
    desc: "Expenses by category, amount and reserve usage.",
    icon: TrendingDown,
    href: "/accounts/expenses",
    module: "Accounts",
  },
  {
    title: "Profit Distribution",
    tone: "info" as Tone,
    desc: "Partner shares, net profit, reserve and distribution summary.",
    icon: ChartPie,
    href: "/accounts/profit-distribution",
    module: "Accounts",
  },
  {
    title: "Reserve Report",
    tone: "violet" as Tone,
    desc: "Reserve ledger, withdrawals and running balance movement.",
    icon: PiggyBank,
    href: "/accounts/reserve",
    module: "Accounts",
  },
  {
    title: "Workforce Report",
    tone: "neutral" as Tone,
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
              Open any report below. Each report is connected to its live module data from the Apps
              Script + Google Sheets backend.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {reports.map((r) => (
          <Link
            key={r.title}
            to={r.href}
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

            <div className="mt-4 flex items-center justify-end gap-1 text-[13px] font-medium text-foreground">
              Open
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
