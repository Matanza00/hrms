import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import type { Tone } from "@/lib/tones";
import { IconTile } from "./IconTile";

/** Figma "Card": header row (icon tile, title, subtitle) over a divider, then the body. */
export function ChartCard({
  title,
  description,
  action,
  children,
  icon,
  tone = "info",
  bodyClassName = "h-64",
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  icon?: LucideIcon;
  tone?: Tone;
  bodyClassName?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-card">
      <div className="flex items-center gap-2.5 border-b border-divider px-5 py-3.5">
        {icon && <IconTile icon={icon} tone={tone} />}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold leading-5 tracking-[-0.2px]">{title}</h3>
          {description && <p className="truncate text-xs text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      <div className="px-5 pb-4 pt-5">
        <div className={`w-full ${bodyClassName}`}>{children}</div>
      </div>
    </div>
  );
}
