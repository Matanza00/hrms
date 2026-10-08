import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/Logo";
import { Printer, Download, ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getPayroll, type PayrollRecord } from "@/lib/api/payroll";
import { useEmployees } from "@/hooks/useEmployees";

export const Route = createFileRoute("/_app/payroll/payslips")({
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
      <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
        Loading payslip...
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

  const payroll = [...payrollRecords]
    .filter((p) => p.status !== "Cancelled")
    .sort(
      (a, b) =>
        new Date(b.generatedAt || "").getTime() -
        new Date(a.generatedAt || "").getTime()
    )[0];

  if (!payroll) {
    return (
      <div className="max-w-3xl space-y-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/payroll">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to payroll
          </Link>
        </Button>
        <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
          No payroll record found. Generate payroll first.
        </div>
      </div>
    );
  }

  const employee = employees.find((e) => e.employeeId === payroll.employeeId);

  const totalEarnings =
    Number(payroll.grossSalary || 0) + Number(payroll.bonus || 0);

  const totalDeductions = Number(payroll.deductionAmount || 0);

  return (
    <div className="max-w-3xl">
      <div className="mb-3 flex items-center justify-between gap-2 print:hidden">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/payroll">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to payroll
          </Link>
        </Button>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            Print
          </Button>

          <Button size="sm" onClick={() => window.print()}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Download PDF
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-8 shadow-sm print:shadow-none">
        <header className="flex items-center justify-between border-b pb-6">
          <div className="flex items-center gap-3">
            <Logo className="h-12 w-12 rounded-xl" />

            <div>
              <p className="text-lg font-semibold">Legit Design Studio</p>
              <p className="text-xs text-muted-foreground">
                HRMS Payroll System
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Payslip
            </p>
            <p className="text-sm font-semibold">
              {formatMonth(payroll.month)}
            </p>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 py-6 border-b">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Employee
            </p>
            <p className="text-sm font-semibold mt-1">
              {employee?.name || payroll.employeeName || payroll.employeeId}
            </p>
            <p className="text-xs text-muted-foreground">
              {employee?.designation || "—"} · {employee?.department || "—"}
            </p>
          </div>

          <div className="sm:text-right">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Code
            </p>
            <p className="text-sm font-semibold mt-1">
              {employee?.employeeCode || "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              Joined {formatDate(employee?.joiningDate)}
            </p>
          </div>
        </section>

        <section className="grid gap-6 sm:grid-cols-2 py-6">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider mb-3 text-muted-foreground">
              Earnings
            </h4>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Basic salary</span>
                <span className="tabular-nums">
                  {formatPKR(payroll.basicSalary)}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Fuel allowance</span>
                <span className="tabular-nums">
                  {formatPKR(payroll.fuelAllowance)}
                </span>
              </div>

              <div className="flex justify-between">
                <span>OPD allowance</span>
                <span className="tabular-nums">
                  {formatPKR(payroll.opdAllowance)}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Bonus</span>
                <span className="tabular-nums">
                  {formatPKR(payroll.bonus)}
                </span>
              </div>

              <div className="flex justify-between border-t pt-2 mt-2 font-medium">
                <span>Total earnings</span>
                <span className="tabular-nums">
                  {formatPKR(totalEarnings)}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider mb-3 text-muted-foreground">
              Deductions
            </h4>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Unpaid leave days</span>
                <span className="tabular-nums">
                  {Number(payroll.unpaidLeaveDays || 0)}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Late deduction days</span>
                <span className="tabular-nums">
                  {Number(payroll.lateFullDays || 0) +
                    Number(payroll.lateHalfDays || 0) * 0.5}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Deficit deduction days</span>
                <span className="tabular-nums">
                  {Number(payroll.deficitFullDays || 0) +
                    Number(payroll.deficitHalfDays || 0) * 0.5}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Sandwich days</span>
                <span className="tabular-nums">
                  {Number(payroll.sandwichDays || 0)}
                </span>
              </div>

              <div className="flex justify-between border-t pt-2 mt-2 font-medium">
                <span>Total deductions</span>
                <span className="tabular-nums">
                  {formatPKR(totalDeductions)}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl bg-muted/50 p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Net salary</p>
            <p className="text-2xl font-semibold">
              {formatPKR(payroll.netSalary)}
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            Status: {payroll.status}
            {payroll.paidAt ? ` · Paid ${formatDate(payroll.paidAt)}` : ""}
          </p>
        </section>

        <footer className="mt-8 grid grid-cols-2 gap-8 pt-8 border-t">
          <div>
            <p className="text-xs text-muted-foreground">
              Employee signature
            </p>
            <div className="h-12 border-b mt-6" />
          </div>

          <div>
            <p className="text-xs text-muted-foreground">
              Authorized signature
            </p>
            <div className="h-12 border-b mt-6" />
          </div>
        </footer>
      </div>
    </div>
  );
}