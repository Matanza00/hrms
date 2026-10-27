import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Wallet } from "lucide-react";
import { getPayroll, type PayrollRecord } from "@/lib/api/payroll";
import { useAuth } from "@/lib/auth/AuthContext";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";

export const Route = createFileRoute("/employee/payroll")({
  head: () => ({ meta: [{ title: "My Payroll — LDS HRMS" }] }),
  component: EmployeePayroll,
});

function formatPKR(v: number | string | undefined) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(Number(v || 0));
}

const money = "font-mono text-[13px] font-medium";

function EmployeePayroll() {
  const { employeeId } = useAuth();
  const {
    data: raw = [],
    isLoading,
    error,
  } = useQuery({ queryKey: ["payroll"], queryFn: getPayroll });
  const records = Array.isArray(raw) ? raw.filter((p) => p.employeeId === employeeId) : [];

  return (
    <div>
      <PageHeader
        icon={Wallet}
        title="My payroll"
        description="Salary, deductions and payslip history."
      />

      <DataTable<PayrollRecord>
        rowKey={(r) => r.payrollId}
        data={records}
        loading={isLoading}
        error={error}
        empty="No payslips yet."
        columns={[
          {
            key: "month",
            header: "Month",
            render: (r) => <span className="font-mono">{String(r.month).slice(0, 7)}</span>,
          },
          {
            key: "grossSalary",
            header: "Gross",
            render: (r) => <span className={money}>{formatPKR(r.grossSalary)}</span>,
          },
          {
            key: "deductionAmount",
            header: "Deductions",
            render: (r) => (
              <span className={`${money} text-danger-ink`}>{formatPKR(r.deductionAmount)}</span>
            ),
          },
          {
            key: "bonus",
            header: "Bonus",
            render: (r) => <span className={money}>{formatPKR(r.bonus)}</span>,
          },
          {
            key: "netSalary",
            header: "Net",
            render: (r) => (
              <span className={`${money} font-semibold`}>{formatPKR(r.netSalary)}</span>
            ),
          },
          { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
        ]}
      />
    </div>
  );
}
