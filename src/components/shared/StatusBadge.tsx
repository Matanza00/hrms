import { cn } from "@/lib/utils";

const variants: Record<string, string> = {
  active: "bg-[oklch(0.7_0.18_152/0.15)] text-[oklch(0.45_0.18_152)] dark:text-[oklch(0.82_0.18_152)]",
  paid: "bg-[oklch(0.7_0.18_152/0.15)] text-[oklch(0.45_0.18_152)] dark:text-[oklch(0.82_0.18_152)]",
  approved: "bg-[oklch(0.7_0.18_152/0.15)] text-[oklch(0.45_0.18_152)] dark:text-[oklch(0.82_0.18_152)]",
  present: "bg-[oklch(0.7_0.18_152/0.15)] text-[oklch(0.45_0.18_152)] dark:text-[oklch(0.82_0.18_152)]",
  received: "bg-[oklch(0.7_0.18_152/0.15)] text-[oklch(0.45_0.18_152)] dark:text-[oklch(0.82_0.18_152)]",

  pending: "bg-[oklch(0.78_0.16_75/0.18)] text-[oklch(0.55_0.16_75)] dark:text-[oklch(0.85_0.16_75)]",
  processing: "bg-[oklch(0.78_0.16_75/0.18)] text-[oklch(0.55_0.16_75)] dark:text-[oklch(0.85_0.16_75)]",
  late: "bg-[oklch(0.78_0.16_75/0.18)] text-[oklch(0.55_0.16_75)] dark:text-[oklch(0.85_0.16_75)]",
  probation: "bg-[oklch(0.78_0.16_75/0.18)] text-[oklch(0.55_0.16_75)] dark:text-[oklch(0.85_0.16_75)]",
  invoiced: "bg-[oklch(0.78_0.16_75/0.18)] text-[oklch(0.55_0.16_75)] dark:text-[oklch(0.85_0.16_75)]",
  half_day: "bg-[oklch(0.78_0.16_75/0.18)] text-[oklch(0.55_0.16_75)] dark:text-[oklch(0.85_0.16_75)]",
  on_leave: "bg-[oklch(0.62_0.19_259/0.15)] text-[oklch(0.5_0.19_259)] dark:text-[oklch(0.78_0.19_259)]",
  leave: "bg-[oklch(0.62_0.19_259/0.15)] text-[oklch(0.5_0.19_259)] dark:text-[oklch(0.78_0.19_259)]",

  rejected: "bg-[oklch(0.62_0.23_27/0.12)] text-[oklch(0.55_0.23_27)] dark:text-[oklch(0.78_0.23_27)]",
  absent: "bg-[oklch(0.62_0.23_27/0.12)] text-[oklch(0.55_0.23_27)] dark:text-[oklch(0.78_0.23_27)]",
  terminated: "bg-[oklch(0.62_0.23_27/0.12)] text-[oklch(0.55_0.23_27)] dark:text-[oklch(0.78_0.23_27)]",
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const cls = variants[status] ?? "bg-muted text-foreground";
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize", cls)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {(label ?? status).replace(/_/g, " ")}
    </span>
  );
}
