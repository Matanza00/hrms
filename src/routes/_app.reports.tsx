import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/PageHeader";
import { BarChart3, Users, Clock, Wallet, TrendingUp, TrendingDown, PiggyBank, CalendarDays } from "lucide-react";

const reports = [
  { title: "Attendance Report", desc: "Monthly attendance with deficits and lates.", icon: Clock, href: "/attendance" },
  { title: "Payroll Report", desc: "Salary, allowance and deduction summary.", icon: Wallet, href: "/payroll" },
  { title: "Leave Report", desc: "Leave balances and usage by employee.", icon: CalendarDays, href: "/leaves" },
  { title: "Revenue Report", desc: "Revenue by client, source and month.", icon: TrendingUp, href: "/accounts/revenue" },
  { title: "Expense Report", desc: "Expense breakdown by category.", icon: TrendingDown, href: "/accounts/expenses" },
  { title: "Profit Distribution", desc: "Partner and reserve distribution.", icon: BarChart3, href: "/accounts/profit-distribution" },
  { title: "Reserve Report", desc: "Reserve ledger and balance movement.", icon: PiggyBank, href: "/accounts/reserve" },
  { title: "Workforce Report", desc: "Headcount, departments, status.", icon: Users, href: "/employees" },
];

export const Route = createFileRoute("/_app/reports")({
  component: () => (
    <div>
      <PageHeader title="Reports" description="Modern analytics across every module." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {reports.map((r) => (
          <Link key={r.title} to={r.href} className="group rounded-2xl border bg-card p-5 transition hover:shadow-sm hover:-translate-y-0.5">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent group-hover:bg-accent group-hover:text-accent-foreground transition">
              <r.icon className="h-4.5 w-4.5" />
            </div>
            <h3 className="mt-4 text-sm font-semibold">{r.title}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{r.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  ),
});
