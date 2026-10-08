import {
  createFileRoute,
  Link,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  BadgeDollarSign,
  FileText,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelPayroll,
  getPayroll,
  markPayrollPaid,
  type PayrollRecord,
} from "@/lib/api/payroll";
import { useEmployees } from "@/hooks/useEmployees";
import { RunPayrollDialog } from "@/components/payroll/RunPayrollDialog";

export const Route = createFileRoute("/_app/payroll")({
  component: PayrollLayout,
});

function formatPKR(value: number | string | undefined) {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatMonth(value?: string) {
  if (!value) return "—";

  const date = new Date(`${String(value).slice(0, 7)}-01`);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-PK", {
    month: "short",
    year: "numeric",
  });
}

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
            <Button variant="outline" size="sm" asChild>
              <Link to="/payroll/payslips">Payslips</Link>
            </Button>

            <RunPayrollDialog />
          </>
        }
      />

      {isRoot ? <PayrollOverview /> : <Outlet />}
    </div>
  );
}

function PayrollOverview() {
  const qc = useQueryClient();

  const { data: employeesRaw = [] } = useEmployees();

  const employees = Array.isArray(employeesRaw)
    ? employeesRaw
    : [];

  function getEmployeeName(employeeId?: string) {
    const employee = employees.find(
      (e) => e.employeeId === employeeId
    );

    return employee?.name || employeeId || "Unknown";
  }

  const {
    data: payrollRecords = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["payroll"],
    queryFn: getPayroll,
  });

  const markPaidMutation = useMutation({
    mutationFn: markPayrollPaid,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payroll"] });
      qc.invalidateQueries({ queryKey: ["accountsOverview"] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: cancelPayroll,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payroll"] });
      qc.invalidateQueries({ queryKey: ["accountsOverview"] });
    },
  });

  if (isLoading) {
    return (
      <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
        Loading payroll...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error instanceof Error ? error.message : "Something went wrong"}
      </div>
    );
  }

  const activePayroll = payrollRecords.filter(
    (p) => p.status !== "Cancelled"
  );

  const totalGross = activePayroll.reduce(
    (a, b) => a + Number(b.grossSalary || 0),
    0
  );

  const deductions = activePayroll.reduce(
    (a, b) => a + Number(b.deductionAmount || 0),
    0
  );

  const bonuses = activePayroll.reduce(
    (a, b) => a + Number(b.bonus || 0),
    0
  );

  const net = activePayroll.reduce(
    (a, b) => a + Number(b.netSalary || 0),
    0
  );

  return (
    <>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="Total Payroll"
          value={formatPKR(totalGross)}
          icon={Wallet}
          tone="accent"
        />

        <StatCard
          label="Deductions"
          value={formatPKR(deductions)}
          icon={ArrowDownCircle}
          tone="danger"
        />

        <StatCard
          label="Bonuses"
          value={formatPKR(bonuses)}
          icon={ArrowUpCircle}
          tone="success"
        />

        <StatCard
          label="Net Payroll"
          value={formatPKR(net)}
          icon={BadgeDollarSign}
          tone="success"
        />
      </div>

      <div className="mt-6">
        <DataTable<PayrollRecord>
          rowKey={(r) => r.payrollId}
          data={payrollRecords}
          columns={[
            {
              key: "employeeName",
              header: "Employee",
              render: (r) => (
                <span className="font-medium">
                  {r.employeeName || getEmployeeName(r.employeeId)}
                </span>
              ),
            },
            {
              key: "month",
              header: "Month",
              render: (r) => formatMonth(r.month),
            },
            {
              key: "grossSalary",
              header: "Gross",
              render: (r) => (
                <span className="tabular-nums">
                  {formatPKR(r.grossSalary)}
                </span>
              ),
            },
            {
              key: "bonus",
              header: "Bonus",
              render: (r) => (
                <span className="tabular-nums text-[oklch(0.55_0.18_152)]">
                  +{formatPKR(r.bonus)}
                </span>
              ),
            },
            {
              key: "deductionAmount",
              header: "Deductions",
              render: (r) => (
                <span className="tabular-nums text-[oklch(0.55_0.23_27)]">
                  -{formatPKR(r.deductionAmount)}
                </span>
              ),
            },
            {
              key: "totalDeductionDays",
              header: "Deduction Days",
              render: (r) => (
                <span className="tabular-nums">
                  {Number(r.totalDeductionDays || 0)}
                </span>
              ),
            },
            {
              key: "netSalary",
              header: "Net",
              render: (r) => (
                <span className="font-semibold tabular-nums">
                  {formatPKR(r.netSalary)}
                </span>
              ),
            },
            {
              key: "status",
              header: "Status",
              render: (r) => <StatusBadge status={r.status} />,
            },
            {
              key: "actions",
              header: "",
              className: "text-right",
              render: (r) => {
                const canPay = r.status === "Generated";
                const canCancel = r.status !== "Cancelled";

                return (
                  <div className="flex justify-end gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7"
                      asChild
                    >
                      <Link to="/payroll/payslips">
                        <FileText className="h-3 w-3 mr-1" />
                        Payslip
                      </Link>
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7"
                      disabled={!canPay || markPaidMutation.isPending}
                      onClick={() =>
                        markPaidMutation.mutate({
                          employeeId: r.employeeId,
                          month: String(r.month).slice(0, 7),
                        })
                      }
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Paid
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7"
                      disabled={!canCancel || cancelMutation.isPending}
                      onClick={() =>
                        cancelMutation.mutate({
                          employeeId: r.employeeId,
                          month: String(r.month).slice(0, 7),
                        })
                      }
                    >
                      <XCircle className="h-3 w-3 mr-1" />
                      Cancel
                    </Button>
                  </div>
                );
              },
            },
          ]}
        />
      </div>
    </>
  );
}