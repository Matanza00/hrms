import { cn } from "@/lib/utils";

/**
 * The LDS brand mark — a white "LDS" on black, served from /public/LDS.png.
 * Pass sizing + rounding via className (e.g. "h-12 w-12 rounded-xl").
 */
export function Logo({ className, alt = "LDS" }: { className?: string; alt?: string }) {
  return (
    <img
      src="/LDS.png"
      alt={alt}
      className={cn("shrink-0 object-cover", className)}
    />
  );
}
