import { camelizeRow, camelizeRows } from "./case.ts";

type Joined = Record<string, unknown> & { employees?: { name?: string } | null };

/**
 * Flatten a joined `employees(name)` embed into a top-level `employeeName`, then
 * camelize. The frontend types expect `employeeName` alongside `employeeId`.
 */
export function withEmployeeName<T = Record<string, unknown>>(
  rows: Joined[] | null | undefined,
): T[] {
  const flattened = (rows ?? []).map((r) => {
    const { employees, ...rest } = r;
    return { ...rest, employee_name: employees?.name ?? null };
  });
  return camelizeRows<T>(flattened);
}

export function withEmployeeNameOne<T = Record<string, unknown>>(
  row: Joined | null | undefined,
): T | null {
  if (!row) return null;
  const { employees, ...rest } = row;
  return camelizeRow<T>({ ...rest, employee_name: employees?.name ?? null });
}
