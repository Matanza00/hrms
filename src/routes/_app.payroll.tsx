import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { payrollRecords, formatPKR, type PayrollRecord } from "@/lib/mock-data";
import { Wallet, ArrowDownCircle, ArrowUpCircle, BadgeDollarSign, FileText } from "lucide-react";

export const Route = createFileRoute("/_app/payroll")({
  component: PayrollLayout,
});

function PayrollLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isRoot = path === "/payroll";
  return (
    <div>
      <PageHeader
        title="Payroll"
        description="Process salaries, allowances and deductions."
        actions={
          <>
            <Button variant="outline" size="sm" asChild><Link to="/payroll/payslips">Payslips</Link></Button>
            <Button size="sm">Run payroll</Button>
          </>
        }
      />
      {isRoot ? <PayrollOverview /> : <Outlet />}
    </div>
  );
}

function PayrollOverview() {
  const total = payrollRecords.reduce((a, b) => a + b.basicSalary + b.allowances, 0);
  const ded = payrollRecords.reduce((a, b) => a + b.deductions, 0);
  const bon = payrollRecords.reduce((a, b) => a + b.bonuses, 0);
  const net = payrollRecords.reduce((a, b) => a + b.netSalary, 0);
  return (
    <>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total Payroll" value={formatPKR(total)} icon={Wallet} tone="accent" />
        <StatCard label="Deductions" value={formatPKR(ded)} icon={ArrowDownCircle} tone="danger" />
        <StatCard label="Bonuses" value={formatPKR(bon)} icon={ArrowUpCircle} tone="success" />
        <StatCard label="Net Payroll" value={formatPKR(net)} icon={BadgeDollarSign} tone="success" />
      </div>
      <div className="mt-6">
        <DataTable<PayrollRecord>
          rowKey={(r) => r.id}
          data={payrollRecords}
          columns={[
            { key: "employeeName", header: "Employee", render: (r) => <span className="font-medium">{r.employeeName}</span> },
            { key: "basicSalary", header: "Basic", render: (r) => <span className="tabular-nums">{formatPKR(r.basicSalary)}</span> },
            { key: "allowances", header: "Allowances", render: (r) => <span className="tabular-nums">{formatPKR(r.allowances)}</span> },
            { key: "bonuses", header: "Bonuses", render: (r) => <span className="tabular-nums text-[oklch(0.55_0.18_152)]">+{formatPKR(r.bonuses)}</span> },
            { key: "deductions", header: "Deductions", render: (r) => <span className="tabular-nums text-[oklch(0.55_0.23_27)]">-{formatPKR(r.deductions)}</span> },
            { key: "netSalary", header: "Net", render: (r) => <span className="font-semibold tabular-nums">{formatPKR(r.netSalary)}</span> },
            { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
            { key: "actions", header: "", className: "text-right", render: () => (
              <Button size="sm" variant="outline" className="h-7" asChild><Link to="/payroll/payslips"><FileText className="h-3 w-3 mr-1" />Payslip</Link></Button>
            )},
          ]}
        />
      </div>
    </>
  );
}
