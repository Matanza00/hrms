import { createFileRoute } from "@tanstack/react-router";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

interface Correction { id: string; employee: string; date: string; reason: string; requestedAt: string; status: string; }
const data: Correction[] = [
  { id: "c1", employee: "Hira Saleem", date: "2026-05-30", reason: "Forgot to check out at 6:15pm", requestedAt: "2026-05-31 09:12", status: "pending" },
  { id: "c2", employee: "Zain Abbas", date: "2026-05-29", reason: "System was down, missed punch-in", requestedAt: "2026-05-29 10:01", status: "pending" },
  { id: "c3", employee: "Bilal Ahmed", date: "2026-05-27", reason: "On-site meeting, no office punch", requestedAt: "2026-05-28 08:30", status: "approved" },
];

export const Route = createFileRoute("/_app/attendance/corrections")({
  component: Corrections,
});

function Corrections() {
  return (
    <DataTable<Correction>
      rowKey={(r) => r.id}
      data={data}
      columns={[
        { key: "employee", header: "Employee", render: (r) => <span className="font-medium">{r.employee}</span> },
        { key: "date", header: "Date" },
        { key: "reason", header: "Reason", render: (r) => <span className="text-muted-foreground">{r.reason}</span> },
        { key: "requestedAt", header: "Requested" },
        { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
        { key: "actions", header: "", className: "text-right", render: () => (
          <div className="flex justify-end gap-1.5">
            <Button size="sm" variant="outline" className="h-7"><Check className="h-3 w-3 mr-1" />Approve</Button>
            <Button size="sm" variant="outline" className="h-7"><X className="h-3 w-3 mr-1" />Reject</Button>
          </div>
        )},
      ]}
    />
  );
}
