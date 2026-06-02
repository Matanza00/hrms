import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: number;
  hint?: string;
  tone?: "default" | "success" | "warning" | "danger" | "accent";
}

const toneClasses: Record<NonNullable<Props["tone"]>, string> = {
  default: "bg-muted text-foreground",
  success: "bg-[oklch(0.7_0.18_152/0.12)] text-[oklch(0.55_0.18_152)] dark:text-[oklch(0.78_0.18_152)]",
  warning: "bg-[oklch(0.78_0.16_75/0.15)] text-[oklch(0.6_0.16_75)] dark:text-[oklch(0.82_0.16_75)]",
  danger: "bg-[oklch(0.62_0.23_27/0.12)] text-[oklch(0.55_0.23_27)] dark:text-[oklch(0.72_0.23_27)]",
  accent: "bg-[oklch(0.62_0.19_259/0.12)] text-[oklch(0.5_0.19_259)] dark:text-[oklch(0.72_0.19_259)]",
};

export function StatCard({ label, value, icon: Icon, trend, hint, tone = "default" }: Props) {
  const up = (trend ?? 0) >= 0;
  return (
    <div className="group relative overflow-hidden rounded-2xl border bg-card p-5 transition-all hover:shadow-sm hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl md:text-[26px] font-semibold tracking-tight">{value}</p>
        </div>
        {Icon && (
          <div className={cn("grid h-10 w-10 place-items-center rounded-xl", toneClasses[tone])}>
            <Icon className="h-4.5 w-4.5" />
          </div>
        )}
      </div>
      <div className="mt-4 flex items-center gap-2 text-xs">
        {trend !== undefined && (
          <span className={cn(
            "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium",
            up ? "bg-[oklch(0.7_0.18_152/0.15)] text-[oklch(0.5_0.18_152)] dark:text-[oklch(0.78_0.18_152)]"
               : "bg-[oklch(0.62_0.23_27/0.12)] text-[oklch(0.55_0.23_27)] dark:text-[oklch(0.72_0.23_27)]"
          )}>
            {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(trend)}%
          </span>
        )}
        {hint && <span className="text-muted-foreground">{hint}</span>}
      </div>
    </div>
  );
}
