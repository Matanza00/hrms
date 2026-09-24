import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

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
}

export function DataTable<T>({ columns, data, empty, rowKey }: Props<T>) {
  if (data.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground sm:p-10">
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
            className="rounded-2xl border bg-card p-4 [&_button]:min-h-11 [&_button]:px-4"
          >
            <div className="text-sm font-semibold">{cell(row, first)}</div>
            <dl className="mt-3 space-y-2">
              {mobileColumns.map((c) =>
                c.header ? (
                  <div key={c.key} className="flex items-start justify-between gap-3">
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                      {c.header}
                    </dt>
                    <dd className="min-w-0 text-right text-sm">{cell(row, c)}</dd>
                  </div>
                ) : (
                  <div key={c.key} className="flex flex-wrap gap-2 pt-1">
                    {cell(row, c)}
                  </div>
                ),
              )}
            </dl>
          </div>
        ))}
      </div>

      {/* Tablets and up: the real table. */}
      <div className="hidden overflow-hidden rounded-2xl border bg-card sm:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className={cn(
                      "px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground",
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
                  className="border-b transition-colors last:border-0 hover:bg-muted/30"
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
