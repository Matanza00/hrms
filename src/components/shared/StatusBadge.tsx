import { cn } from "@/lib/utils";
import { toneSoft, type Tone } from "@/lib/tones";

const tones: Record<string, Tone> = {
  active: "success",
  paid: "success",
  generated: "success",
  approved: "success",
  present: "success",
  received: "success",
  permanent: "success",

  pending: "warning",
  processing: "warning",
  late: "warning",
  probation: "warning",
  invoiced: "warning",
  half_day: "warning",

  on_leave: "info",
  leave: "info",
  notice_period: "warning",
  resigned: "neutral",
  cancelled: "neutral",
  completed: "neutral",

  rejected: "danger",
  absent: "danger",
  terminated: "danger",
};

/** Figma "Badge": 22px, tinted fill and border, 6px dot in the ink colour. */
export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const tone =
    tones[
      String(status ?? "")
        .toLowerCase()
        .replace(/[\s-]+/g, "_")
    ] ?? "neutral";
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-sm border px-2 text-xs font-medium capitalize",
        toneSoft[tone],
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {String(label ?? status ?? "").replace(/_/g, " ")}
    </span>
  );
}
