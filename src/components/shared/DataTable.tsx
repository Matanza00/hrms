import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  className?: string;
}

interface Props<T> {
  columns: Column<T>[];
  data: T[];
  empty?: ReactNode;
  rowKey: (row: T) => string;
}

export function DataTable<T>({ columns, data, empty, rowKey }: Props<T>) {
  if (data.length === 0) {
    return <div className="rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground">{empty ?? "No records found"}</div>;
  }
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left">
              {columns.map((c) => (
                <th key={c.key} className={cn("px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground", c.className)}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={rowKey(row)} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                {columns.map((c) => (
                  <td key={c.key} className={cn("px-4 py-3.5 align-middle", c.className)}>
                    {c.render ? c.render(row) : (row as Record<string, ReactNode>)[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
