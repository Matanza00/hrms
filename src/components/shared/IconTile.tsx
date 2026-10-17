import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toneSolid, type Tone } from "@/lib/tones";

const sizes = {
  sm: "size-6 rounded-sm [&_svg]:size-3.5", // card header
  md: "size-8 rounded-md [&_svg]:size-4", // empty state
  lg: "size-9 rounded-lg [&_svg]:size-[18px]", // page header
};

/** Figma "Icon Tile": a solid accent square holding a white lucide icon. */
export function IconTile({
  icon: Icon,
  tone = "info",
  size = "sm",
  className,
}: {
  icon: LucideIcon;
  tone?: Tone;
  size?: keyof typeof sizes;
  className?: string;
}) {
  return (
    <div
      className={cn("grid shrink-0 place-items-center", sizes[size], toneSolid[tone], className)}
    >
      <Icon />
    </div>
  );
}
