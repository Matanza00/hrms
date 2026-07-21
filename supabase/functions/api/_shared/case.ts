// The DB uses snake_case columns; the React types use camelCase. We convert
// centrally here so neither side has to care about the other's convention.

export function toSnake(s: string): string {
  return s.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
}

export function toCamel(s: string): string {
  return s.replace(/_([a-z0-9])/g, (_m, c) => c.toUpperCase());
}

/** DB row (snake) -> API object (camel). Returns null for null input. */
export function camelizeRow<T = Record<string, unknown>>(
  row: Record<string, unknown> | null | undefined,
): T | null {
  if (!row) return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) out[toCamel(k)] = v;
  return out as T;
}

/** Array of DB rows -> array of API objects. */
export function camelizeRows<T = Record<string, unknown>>(
  rows: Record<string, unknown>[] | null | undefined,
): T[] {
  return (rows ?? []).map((r) => camelizeRow<T>(r) as T);
}

/** API object (camel) -> DB patch (snake). Drops undefined values. */
export function snakeizeObj(
  obj: Record<string, unknown>,
  { dropUndefined = true } = {},
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (dropUndefined && v === undefined) continue;
    out[toSnake(k)] = v;
  }
  return out;
}
