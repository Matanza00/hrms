import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/Logo";
import { Printer, Download, ArrowLeft, FileText } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useQuery } from "@tanstack/react-query";
import { getPayroll, type PayrollRecord } from "@/lib/api/payroll";
import { useEmployees } from "@/hooks/useEmployees";

export const Route = createFileRoute("/_app/payroll/payslips")({
  head: () => ({ meta: [{ title: "Payslips — LDS HRMS" }] }),
  component: PayslipsPage,
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
    month: "long",
    year: "numeric",
  });
}

function formatDate(value?: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function PayslipsPage() {
  const {
    data: payrollRecords = [],
    isLoading: payrollLoading,
    error: payrollError,
  } = useQuery({
    queryKey: ["payroll"],
    queryFn: getPayroll,
  });

  const {
    data: employees = [],
    isLoading: employeesLoading,
    error: employeesError,
  } = useEmployees();

  const isLoading = payrollLoading || employeesLoading;
  const error = payrollError || employeesError;

  if (isLoading) {
    return (
      <div className="rounded-2xl border bg-card p-6 text-[13px] text-muted-foreground">
        Loading payslip...
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

  const payroll = [...payrollRecords]
    .filter((p) => p.status !== "Cancelled")
    .sort(
      (a, b) => new Date(b.generatedAt || "").getTime() - new Date(a.generatedAt || "").getTime(),
    )[0];

  if (!payroll) {
    return (
      <div className="max-w-3xl space-y-3">
        <Button variant="ghost" asChild>
          <Link to="/payroll">
            <ArrowLeft />
            Back to payroll
          </Link>
        </Button>
        <EmptyState
          icon={FileText}
          title="No payroll record found."
          description="Generate payroll first."
        />
      </div>
    );
  }

  const employee = employees.find((e) => e.employeeId === payroll.employeeId);

  const totalEarnings = Number(payroll.grossSalary || 0) + Number(payroll.bonus || 0);

  const totalDeductions = Number(payroll.deductionAmount || 0);

  return (
    <div className="max-w-3xl">
      <div className="mb-3 flex items-center justify-between gap-2 print:hidden">
        <Button variant="ghost" asChild>
          <Link to="/payroll">
            <ArrowLeft />
            Back to payroll
          </Link>
        </Button>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer />
            Print
          </Button>

          <Button onClick={() => window.print()}>
            <Download />
            Download PDF
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-5 sm:p-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-divider pb-6">
          <div className="flex items-center gap-3">
            <Logo className="size-12 rounded-xl" />

            <div>
              <p className="text-base font-semibold tracking-[-0.2px]">Legit Design Studio</p>
              <p className="text-xs text-muted-foreground">HRMS Payroll System</p>
            </div>
          </div>

          <div className="text-right">
            <p className="font-mono text-xs text-muted-foreground">Payslip</p>
            <p className="text-sm font-semibold">{formatMonth(payroll.month)}</p>
          </div>
        </header>

        <section className="grid gap-4 border-b border-divider py-6 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Employee</p>
            <p className="mt-1 text-sm font-medium">
              {employee?.name || payroll.employeeName || payroll.employeeId}
            </p>
            <p className="text-xs text-muted-foreground">
              {employee?.designation || "—"} · {employee?.department || "—"}
            </p>
          </div>

          <div className="sm:text-right">
            <p className="text-xs text-muted-foreground">Code</p>
            <p className="mt-1 font-mono text-sm font-medium">{employee?.employeeCode || "—"}</p>
            <p className="text-xs text-muted-foreground">
              Joined {formatDate(employee?.joiningDate)}
            </p>
          </div>
        </section>

        <section className="grid gap-6 py-6 sm:grid-cols-2">
          <div>
            <h4 className="mb-3 text-[13px] font-medium leading-[18px] text-muted-foreground">
              Earnings
            </h4>

            <div className="space-y-2 text-[13px]">
              <div className="flex justify-between">
                <span>Basic salary</span>
                <span className="font-mono tabular-nums">{formatPKR(payroll.basicSalary)}</span>
              </div>

              <div className="flex justify-between">
                <span>Fuel allowance</span>
                <span className="font-mono tabular-nums">{formatPKR(payroll.fuelAllowance)}</span>
              </div>

              <div className="flex justify-between">
                <span>OPD allowance</span>
                <span className="font-mono tabular-nums">{formatPKR(payroll.opdAllowance)}</span>
              </div>

              <div className="flex justify-between">
                <span>Bonus</span>
                <span className="font-mono tabular-nums">{formatPKR(payroll.bonus)}</span>
              </div>

              <div className="mt-2 flex justify-between border-t border-divider pt-2 font-medium">
                <span>Total earnings</span>
                <span className="font-mono tabular-nums">{formatPKR(totalEarnings)}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="mb-3 text-[13px] font-medium leading-[18px] text-muted-foreground">
              Deductions
            </h4>

            <div className="space-y-2 text-[13px]">
              <div className="flex justify-between">
                <span>Unpaid leave days</span>
                <span className="font-mono tabular-nums">
                  {Number(payroll.unpaidLeaveDays || 0)}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Late deduction days</span>
                <span className="font-mono tabular-nums">
                  {Number(payroll.lateFullDays || 0) + Number(payroll.lateHalfDays || 0) * 0.5}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Deficit deduction days</span>
                <span className="font-mono tabular-nums">
                  {Number(payroll.deficitFullDays || 0) +
                    Number(payroll.deficitHalfDays || 0) * 0.5}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Sandwich days</span>
                <span className="font-mono tabular-nums">{Number(payroll.sandwichDays || 0)}</span>
              </div>

              <div className="mt-2 flex justify-between border-t border-divider pt-2 font-medium">
                <span>Total deductions</span>
                <span className="font-mono tabular-nums">{formatPKR(totalDeductions)}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-subtle p-5">
          <div>
            <p className="text-[13px] font-medium leading-[18px] text-muted-foreground">
              Net salary
            </p>
            <p className="mt-1 font-mono text-[26px] font-medium leading-8 tracking-[-0.8px] tabular-nums">
              {formatPKR(payroll.netSalary)}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <StatusBadge status={payroll.status} />
            {payroll.paidAt ? `Paid ${formatDate(payroll.paidAt)}` : ""}
          </div>
        </section>

        <footer className="mt-8 grid grid-cols-2 gap-8 border-t border-divider pt-8">
          <div>
            <p className="text-xs text-muted-foreground">Employee signature</p>
            <div className="mt-6 h-12 border-b" />
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Authorized signature</p>
            <div className="mt-6 h-12 border-b" />
          </div>
        </footer>
      </div>
    </div>
  );
}
