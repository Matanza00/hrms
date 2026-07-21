import type { Ctx } from "../_shared/context.ts";
import { numOrNull, str } from "../_shared/context.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { ApiError } from "../_shared/errors.ts";
import { camelizeRow, camelizeRows } from "../_shared/case.ts";
import { karachiParts } from "../_shared/time.ts";

export async function getRevenue(ctx: Ctx) {
  requireAdmin(ctx.caller);
  const { data, error } = await ctx.svc
    .from("revenue").select("*").order("revenue_date", { ascending: false });
  if (error) throw new ApiError(error.message, 500);
  return camelizeRows(data);
}

export async function createRevenue(ctx: Ctx) {
  const caller = requireAdmin(ctx.caller);
  const row = {
    revenue_date: str(ctx.data.revenueDate),
    amount: numOrNull(ctx.data.amount) ?? 0,
    category: str(ctx.data.category) || null,
    client: str(ctx.data.client) || null,
    source: str(ctx.data.source) || null,
    description: str(ctx.data.description) || null,
    created_by: caller.username,
  };
  if (!row.revenue_date) throw new ApiError("revenueDate is required");
  const { data, error } = await ctx.svc.from("revenue").insert(row).select("*").single();
  if (error) throw new ApiError(error.message, 500);
  return camelizeRow(data);
}

export async function getExpenses(ctx: Ctx) {
  requireAdmin(ctx.caller);
  const { data, error } = await ctx.svc
    .from("expenses").select("*").order("expense_date", { ascending: false });
  if (error) throw new ApiError(error.message, 500);
  return camelizeRows(data);
}

export async function createExpense(ctx: Ctx) {
  const caller = requireAdmin(ctx.caller);
  const row = {
    expense_date: str(ctx.data.expenseDate),
    amount: numOrNull(ctx.data.amount) ?? 0,
    category: str(ctx.data.category),
    description: str(ctx.data.description) || null,
    created_by: caller.username,
  };
  if (!row.expense_date || !row.category) throw new ApiError("expenseDate and category are required");
  const { data, error } = await ctx.svc.from("expenses").insert(row).select("*").single();
  if (error) throw new ApiError(error.message, 500);
  return camelizeRow(data);
}

export async function getReserveLedger(ctx: Ctx) {
  requireAdmin(ctx.caller);
  const { data, error } = await ctx.svc
    .from("reserve_ledger").select("*").order("created_at", { ascending: false });
  if (error) throw new ApiError(error.message, 500);
  return camelizeRows(data);
}

/** Summary + 6-month trend + profit distribution. */
export async function getAccountsOverview(ctx: Ctx) {
  requireAdmin(ctx.caller);
  const svc = ctx.svc;

  const [revRes, expRes, reserveRes, distRes] = await Promise.all([
    svc.from("revenue").select("revenue_date, amount"),
    svc.from("expenses").select("expense_date, amount"),
    svc.from("reserve_ledger").select("balance_after").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    svc.from("profit_distribution").select("name, percent").order("sort_order", { ascending: true }),
  ]);
  if (revRes.error) throw new ApiError(revRes.error.message, 500);
  if (expRes.error) throw new ApiError(expRes.error.message, 500);

  const revenue = revRes.data ?? [];
  const expenses = expRes.data ?? [];
  const totalRevenue = revenue.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const netProfit = totalRevenue - totalExpenses;
  const reserveBalance = Number(reserveRes.data?.balance_after ?? 0);

  // Last 6 calendar months (Karachi), revenue vs expense.
  const now = new Date();
  const p = karachiParts(now);
  const buckets: { key: string; month: string; revenue: number; expense: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(p.year, p.month - i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
    buckets.push({ key, month: label, revenue: 0, expense: 0 });
  }
  const bucketFor = (dateStr: string) => buckets.find((b) => String(dateStr).startsWith(b.key));
  for (const r of revenue) { const b = bucketFor(str(r.revenue_date)); if (b) b.revenue += Number(r.amount) || 0; }
  for (const e of expenses) { const b = bucketFor(str(e.expense_date)); if (b) b.expense += Number(e.amount) || 0; }

  const distribution = (distRes.data ?? []).map((d) => ({
    name: d.name as string,
    percent: Number(d.percent) || 0,
    amount: Math.round((netProfit * (Number(d.percent) || 0)) / 100),
  }));

  return {
    summary: { totalRevenue, totalExpenses, netProfit, reserveBalance },
    trend: buckets.map(({ month, revenue, expense }) => ({ month, revenue, expense })),
    distribution,
  };
}
