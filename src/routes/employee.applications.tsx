import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ChevronRight,
  ClipboardList,
  ClockAlert,
  HandCoins,
  Landmark,
  Package,
  Receipt,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { IconTile } from "@/components/shared/IconTile";
import { ResignationApplication } from "@/components/employees/ResignationApplication";

const upcoming = [
  { label: "Reimbursement", icon: Receipt },
  { label: "Advance Salary", icon: HandCoins },
  { label: "Loan Request", icon: Landmark },
  { label: "Asset Request", icon: Package },
];

export const Route = createFileRoute("/employee/applications")({
  head: () => ({ meta: [{ title: "Applications — LDS HRMS" }] }),
  component: () => (
    <div>
      <PageHeader
        icon={ClipboardList}
        title="Applications"
        description="Attendance correction, reimbursement, advance salary and other requests."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Link
          to="/employee/corrections"
          className="flex min-h-11 items-center gap-3 rounded-2xl border bg-card p-5 transition-colors hover:bg-subtle"
        >
          <IconTile icon={ClockAlert} tone="warning" size="md" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold tracking-[-0.2px]">Attendance Correction</p>
            <p className="text-xs text-muted-foreground">Request a fix to your attendance times</p>
          </div>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </Link>

        <ResignationApplication />

        {upcoming.map((a) => (
          <div key={a.label} className="flex items-center gap-3 rounded-2xl border bg-card p-5">
            <IconTile icon={a.icon} tone="neutral" size="md" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold tracking-[-0.2px]">{a.label}</p>
              <p className="text-xs text-muted-foreground">Form coming next</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  ),
});
