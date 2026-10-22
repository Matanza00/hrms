/** "2026-10-31" -> "31 Oct 2026" (local day, no timezone shift); "—" when empty. */
export function formatDay(value?: string | null) {
  if (!value) return "—";
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? String(value)
    : d.toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
}
