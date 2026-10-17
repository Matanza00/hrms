import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { toneInk } from "@/lib/tones";

interface Props {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: number;
  hint?: string;
  tone?: "default" | "success" | "warning" | "danger" | "accent";
}

const iconTone: Record<NonNullable<Props["tone"]>, string> = {
  default: toneInk.neutral,
  success: toneInk.success,
  warning: toneInk.warning,
  danger: toneInk.danger,
  accent: toneInk.info,
};

/** Figma "Metric": 13px label with a 14px icon over a 26px Geist Mono figure. */
export function StatCard({ label, value, icon: Icon, trend, hint, tone = "default" }: Props) {
  const up = (trend ?? 0) >= 0;
  return (
    <div className="flex min-w-0 flex-col gap-2.5 rounded-2xl border bg-card px-4 pb-[18px] pt-4 sm:px-5">
      {/* The label wraps rather than truncating: a card headed "Remainin…"
          tells the reader nothing. The figure itself stays on one line. */}
      <div className="flex min-w-0 items-start gap-1.5">
        {Icon && <Icon className={cn("mt-[2px] size-3.5 shrink-0", iconTone[tone])} />}
        <p className="min-w-0 text-pretty text-[13px] font-medium leading-[18px] text-muted-foreground">
          {label}
        </p>
      </div>
      <p className="truncate font-mono text-[22px] font-medium leading-8 tracking-[-0.8px] tabular-nums sm:text-[26px]">
        {value}
      </p>
      {(trend !== undefined || hint) && (
        <div className="-mt-1 flex items-center gap-2 text-xs">
          {trend !== undefined && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-mono font-medium",
                up ? "text-success-ink" : "text-danger-ink",
              )}
            >
              {up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
              {Math.abs(trend)}%
            </span>
          )}
          {hint && <span className="truncate text-muted-foreground">{hint}</span>}
        </div>
      )}
    </div>
  );
}
