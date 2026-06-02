import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { payrollRecords, formatPKR, employees } from "@/lib/mock-data";
import { Printer, Download, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_app/payroll/payslips")({
  component: () => {
    const p = payrollRecords[0];
    const emp = employees.find((e) => e.id === p.employeeId)!;
    return (
      <div className="max-w-3xl">
        <div className="mb-3 flex justify-end gap-2">
          <Button variant="outline" size="sm"><Printer className="mr-1.5 h-3.5 w-3.5" />Print</Button>
          <Button size="sm"><Download className="mr-1.5 h-3.5 w-3.5" />Download PDF</Button>
        </div>
        <div className="rounded-2xl border bg-card p-8 shadow-sm print:shadow-none">
          <header className="flex items-center justify-between border-b pb-6">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground"><Sparkles className="h-5 w-5" /></div>
              <div>
                <p className="text-lg font-semibold">Nexus Technologies</p>
                <p className="text-xs text-muted-foreground">DHA Phase 5, Lahore · +92 42 35000000</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Payslip</p>
              <p className="text-sm font-semibold">{p.month}</p>
            </div>
          </header>

          <section className="grid gap-4 sm:grid-cols-2 py-6 border-b">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Employee</p>
              <p className="text-sm font-semibold mt-1">{emp.name}</p>
              <p className="text-xs text-muted-foreground">{emp.designation} · {emp.department}</p>
            </div>
            <div className="sm:text-right">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Code</p>
              <p className="text-sm font-semibold mt-1">{emp.code}</p>
              <p className="text-xs text-muted-foreground">Joined {emp.joiningDate}</p>
            </div>
          </section>

          <section className="grid gap-6 sm:grid-cols-2 py-6">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider mb-3 text-muted-foreground">Earnings</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Basic salary</span><span className="tabular-nums">{formatPKR(p.basicSalary)}</span></div>
                <div className="flex justify-between"><span>Allowances</span><span className="tabular-nums">{formatPKR(p.allowances)}</span></div>
                <div className="flex justify-between"><span>Bonuses</span><span className="tabular-nums">{formatPKR(p.bonuses)}</span></div>
                <div className="flex justify-between border-t pt-2 mt-2 font-medium"><span>Total earnings</span><span className="tabular-nums">{formatPKR(p.basicSalary + p.allowances + p.bonuses)}</span></div>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider mb-3 text-muted-foreground">Deductions</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Tax & EOBI</span><span className="tabular-nums">{formatPKR(p.deductions)}</span></div>
                <div className="flex justify-between border-t pt-2 mt-2 font-medium"><span>Total deductions</span><span className="tabular-nums">{formatPKR(p.deductions)}</span></div>
              </div>
            </div>
          </section>

          <section className="rounded-xl bg-muted/50 p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Net salary</p>
              <p className="text-2xl font-semibold">{formatPKR(p.netSalary)}</p>
            </div>
            <p className="text-xs text-muted-foreground">Paid on 30 {p.month}</p>
          </section>

          <footer className="mt-8 grid grid-cols-2 gap-8 pt-8 border-t">
            <div><p className="text-xs text-muted-foreground">Employee signature</p><div className="h-12 border-b mt-6" /></div>
            <div><p className="text-xs text-muted-foreground">Authorized signature</p><div className="h-12 border-b mt-6" /></div>
          </footer>
        </div>
      </div>
    );
  },
});
