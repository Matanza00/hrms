/**
 * Figma "accent/*" tones. Solid fills icon tiles, chart series and swatches;
 * soft is the badge treatment (tint background, tinted border, darker ink).
 */
export type Tone = "neutral" | "info" | "success" | "warning" | "danger" | "violet";

export const toneSolid: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  info: "bg-info text-white",
  success: "bg-success text-white",
  warning: "bg-warning text-white",
  danger: "bg-destructive text-white",
  violet: "bg-violet text-white",
};

export const toneSoft: Record<Tone, string> = {
  neutral: "border-border bg-subtle text-text-secondary",
  info: "border-info-line bg-info-tint text-info-ink",
  success: "border-success-line bg-success-tint text-success-ink",
  warning: "border-warning-line bg-warning-tint text-warning-ink",
  danger: "border-danger-line bg-danger-tint text-danger-ink",
  violet: "border-violet-line bg-violet-tint text-violet-ink",
};

export const toneInk: Record<Tone, string> = {
  neutral: "text-muted-foreground",
  info: "text-info-ink",
  success: "text-success-ink",
  warning: "text-warning-ink",
  danger: "text-danger-ink",
  violet: "text-violet-ink",
};
