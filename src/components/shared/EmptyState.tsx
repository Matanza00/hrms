import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

/** Figma "empty": dashed 10px box, neutral icon tile, 13px muted copy. */
export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2.5 rounded-lg border border-dashed bg-card px-6 py-10 text-center">
      <div className="grid size-8 place-items-center rounded-md bg-muted">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div>
        <h3 className="text-[13px] font-medium leading-[18px] text-foreground">{title}</h3>
        {description && (
          <p className="mx-auto mt-0.5 max-w-sm text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
