/**
 * Open a clean, printable report in a new window and trigger the browser's
 * "Save as PDF" dialog. No PDF dependency — the same window.print() route the
 * payslip uses, which every browser can export to PDF.
 */
export function openPrintableReport(opts: {
  title: string;
  subtitle?: string;
  columns: string[];
  rows: (string | number)[][];
  /** Right-align these column indexes (numbers/amounts). */
  numericCols?: number[];
}) {
  const { title, subtitle, columns, rows, numericCols = [] } = opts;

  const win = window.open("", "_blank", "width=960,height=720");
  if (!win) {
    alert("Please allow pop-ups for this site to download reports.");
    return;
  }

  const esc = (v: unknown) =>
    String(v ?? "").replace(/[&<>"]/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string,
    );

  const numeric = new Set(numericCols);
  const generatedAt = new Date().toLocaleString("en-PK", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  // Absolute URL so the logo loads inside the opened print window.
  const logoUrl = `${window.location.origin}/LDS.png`;

  const thead = columns
    .map((c, i) => `<th class="${numeric.has(i) ? "num" : ""}">${esc(c)}</th>`)
    .join("");

  const tbody = rows.length
    ? rows
        .map(
          (r) =>
            `<tr>${r
              .map(
                (cell, i) =>
                  `<td class="${numeric.has(i) ? "num" : ""}">${esc(cell)}</td>`,
              )
              .join("")}</tr>`,
        )
        .join("")
    : `<tr><td colspan="${columns.length}" class="empty">No records</td></tr>`;

  win.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${esc(title)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #111; margin: 32px; }
  header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #111; padding-bottom: 16px; margin-bottom: 20px; }
  .brand { display: flex; align-items: center; gap: 12px; }
  .logo { width: 44px; height: 44px; border-radius: 10px; object-fit: cover; }
  .org { font-size: 15px; font-weight: 600; }
  .org small { display:block; font-weight: 400; color:#666; font-size: 11px; }
  .meta { text-align: right; }
  .meta h1 { font-size: 16px; margin: 0 0 4px; }
  .meta small { color: #666; font-size: 11px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #e5e5e5; }
  th { background: #f6f6f6; text-transform: uppercase; letter-spacing: .04em; font-size: 10px; color: #555; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  td.empty { text-align: center; color: #888; padding: 24px; }
  tfoot td { color: #888; font-size: 10px; padding-top: 12px; border: 0; }
  @media print { body { margin: 12mm; } }
</style>
</head>
<body>
  <header>
    <div class="brand">
      <img class="logo" src="${esc(logoUrl)}" alt="LDS" />
      <div class="org">Legit Design Studio<small>HRMS &amp; Accounts</small></div>
    </div>
    <div class="meta">
      <h1>${esc(title)}</h1>
      <small>${esc(subtitle ?? "")}</small><br/>
      <small>Generated ${esc(generatedAt)} · ${rows.length} record${rows.length === 1 ? "" : "s"}</small>
    </div>
  </header>

  <table>
    <thead><tr>${thead}</tr></thead>
    <tbody>${tbody}</tbody>
  </table>

  <script>window.onload = function(){ window.focus(); window.print(); };</script>
</body>
</html>`);
  win.document.close();
}

export function formatPKR(value: number | string | undefined) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function formatReportDate(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
