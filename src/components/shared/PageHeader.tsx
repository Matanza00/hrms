import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import type { Tone } from "@/lib/tones";
import { IconTile } from "./IconTile";

/** Figma "page-header": icon tile, 20px title, 13px muted description, actions right. */
export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  icon,
  tone = "info",
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  eyebrow?: string;
  icon?: LucideIcon;
  tone?: Tone;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        {icon && <IconTile icon={icon} tone={tone} size="lg" />}
        <div className="min-w-0">
          {eyebrow && <p className="mb-0.5 font-mono text-xs text-muted-foreground">{eyebrow}</p>}
          <h1 className="text-xl font-semibold leading-7 tracking-[-0.4px] text-foreground">
            {title}
          </h1>
          {description && (
            <p className="mt-0.5 max-w-2xl text-[13px] leading-[18px] text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SectionHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-sm font-semibold leading-5 tracking-[-0.2px]">{title}</h2>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {actions}
    </div>
  );
}
