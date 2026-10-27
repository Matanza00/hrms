/**
 * Animation props for a recharts series. Recharts animates in JS, so the CSS
 * reduced-motion rule never reaches it; this checks the setting itself.
 *  - chartMotion("off"): screens people open many times a day (the dashboard)
 *    draw instantly; replaying a 1.5s draw on every visit only slows them down.
 *  - chartMotion(): a short, strong ease-out draw (recharts' default is 1.5s).
 */
export function chartMotion(mode: "short" | "off" = "short") {
  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (mode === "off" || reduce) return { isAnimationActive: false } as const;
  return {
    isAnimationActive: true,
    animationBegin: 0,
    animationDuration: 400,
    animationEasing: "ease-out",
  } as const;
}
