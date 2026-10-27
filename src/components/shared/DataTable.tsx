import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  className?: string;
  /**
   * Hide this column on phones. For columns that only make sense next to the
   * others, so a narrow screen is not padded out with near-empty rows.
   */
  hideOnMobile?: boolean;
}

interface Props<T> {
  columns: Column<T>[];
  data: T[];
  empty?: ReactNode;
  rowKey: (row: T) => string;
  /** Still fetching: show placeholder rows, never the "nothing here" message. */
  loading?: boolean;
  /** The fetch failed: say so instead of pretending the list is empty. */
  error?: unknown;
}

export function DataTable<T>({ columns, data, empty, rowKey, loading, error }: Props<T>) {
  if (loading && data.length === 0) {
    // Same height as real rows, so nothing jumps when the data lands.
    return (
      <div
        aria-busy="true"
        aria-label="Loading"
        className="overflow-hidden rounded-2xl border bg-card"
      >
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="flex h-[52px] items-center gap-4 border-b border-divider px-4 last:border-0"
          >
            <Skeleton className="h-3.5 w-1/4" />
            <Skeleton className="h-3.5 w-1/6" />
            <Skeleton className="ml-auto h-3.5 w-1/5" />
          </div>
        ))}
      </div>
    );
  }

  if (error && data.length === 0) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-danger-line bg-danger-tint p-4 text-[13px] text-danger-ink"
      >
        {error instanceof Error ? error.message : "Couldn't load this list."}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-card p-8 text-center text-[13px] text-muted-foreground sm:p-10">
        {empty ?? "No records found"}
      </div>
    );
  }

  const cell = (row: T, c: Column<T>) =>
    c.render ? c.render(row) : (row as Record<string, ReactNode>)[c.key];

  // A column with no header is an actions column: its buttons speak for
  // themselves, so the card layout gives it a row of its own without a label.
  const [first, ...rest] = columns;
  const mobileColumns = rest.filter((c) => !c.hideOnMobile);

  return (
    <>
      {/* Phones: one card per row. A table this wide can only be read by
          scrolling it sideways, which hides the name you are reading against. */}
      <div className="space-y-3 sm:hidden">
        {data.map((row) => (
          <div
            key={rowKey(row)}
            className="rounded-2xl border bg-card p-4 shadow-xs [&_button]:min-h-11 [&_button]:px-4"
          >
            <div className="text-sm font-semibold">{cell(row, first)}</div>
            <dl className="mt-3 space-y-2">
              {mobileColumns.map((c) =>
                c.header ? (
                  <div key={c.key} className="flex items-start justify-between gap-3">
                    <dt className="shrink-0 text-xs text-muted-foreground">{c.header}</dt>
                    {/* Long emails / names break instead of running off the card. */}
                    <dd className="min-w-0 text-right text-sm [overflow-wrap:anywhere]">
                      {cell(row, c)}
                    </dd>
                  </div>
                ) : (
                  // Row actions wrap on narrow phones instead of pushing the
                  // last button off the card; link-buttons get the 44px target too.
                  <div
                    key={c.key}
                    className="flex flex-wrap gap-2 pt-1 [&>div]:flex-wrap [&>div]:justify-start [&_a]:min-h-11 [&_a]:px-4"
                  >
                    {cell(row, c)}
                  </div>
                ),
              )}
            </dl>
          </div>
        ))}
      </div>

      {/* Tablets and up: the real table. */}
      <div className="hidden overflow-hidden rounded-2xl border bg-card shadow-xs sm:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-subtle text-left">
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className={cn(
                      "h-10 px-4 text-[13px] font-medium text-muted-foreground",
                      c.className,
                    )}
                  >
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr
                  key={rowKey(row)}
                  className="border-b transition-colors last:border-0 hover:bg-subtle"
                >
                  {columns.map((c) => (
                    <td key={c.key} className={cn("px-4 py-3.5 align-middle", c.className)}>
                      {cell(row, c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
