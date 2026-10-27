import type { CSSProperties } from "react";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Toasts on the app's glass material. Sonner paints its own background, so the
 * colours go in through its CSS variables; .material-popover adds the blur.
 * Top centre: clear of the floating feedback button and the phone keyboard.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      position="top-center"
      offset={16}
      gap={8}
      style={
        {
          "--normal-bg": "color-mix(in oklab, var(--color-popover) 80%, transparent)",
          "--normal-border": "var(--color-border)",
          "--normal-text": "var(--color-popover-foreground)",
          "--border-radius": "var(--radius-xl)",
        } as CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "group toast material-popover shadow-lg text-[13px]",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
