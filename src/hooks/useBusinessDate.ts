import { useEffect, useState } from "react";
import { currentBusinessDate } from "@/lib/businessDate";

/**
 * The business date, kept current while the page stays open. Computing it once
 * per render is not enough: a tab left open after a 3 AM checkout would still
 * be showing that finished shift at 6 PM, because nothing re-renders on its own
 * (a background refetch returning identical data does not).
 */
export function useCurrentBusinessDate() {
  const [date, setDate] = useState(currentBusinessDate);

  useEffect(() => {
    const update = () => setDate(currentBusinessDate());
    const timer = window.setInterval(update, 60_000);
    // Background tabs throttle timers, so also re-check when the user returns.
    document.addEventListener("visibilitychange", update);
    window.addEventListener("focus", update);
    update();
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", update);
      window.removeEventListener("focus", update);
    };
  }, []);

  return date;
}
