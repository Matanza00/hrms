import type { SupabaseClient } from "@supabase/supabase-js";
import type { Ctx } from "../_shared/context.ts";
import { numOrNull, str } from "../_shared/context.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { bool } from "../_shared/settings.ts";
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
    // status omitted on purpose — the column default ('Pending') applies.
    created_by: caller.username,
  };
  if (!row.revenue_date) throw new ApiError("revenueDate is required");
  const { data, error } = await ctx.svc.from("revenue").insert(row).select("*").single();
  if (error) throw new ApiError(error.message, 500);
  return camelizeRow(data);
}

export async function updateRevenue(ctx: Ctx) {
  requireAdmin(ctx.caller);
  const revenueId = str(ctx.data.revenueId);
  if (!revenueId) throw new ApiError("revenueId is required");
  const f = ctx.data;
  const patch: Record<string, unknown> = {};
  if (f.revenueDate !== undefined) patch.revenue_date = str(f.revenueDate);
  if (f.amount !== undefined) patch.amount = numOrNull(f.amount) ?? 0;
  if (f.category !== undefined) patch.category = str(f.category) || null;
  if (f.client !== undefined) patch.client = str(f.client) || null;
  if (f.source !== undefined) patch.source = str(f.source) || null;
  if (f.description !== undefined) patch.description = str(f.description) || null;
  if (f.status !== undefined) patch.status = str(f.status) || null;
  const { data, error } = await ctx.svc
    .from("revenue").update(patch).eq("revenue_id", revenueId).select("*").maybeSingle();
  if (error) throw new ApiError(error.message, 500);
  if (!data) throw new ApiError("Revenue not found", 404);
  return camelizeRow(data);
}

export async function setRevenueStatus(ctx: Ctx) {
  requireAdmin(ctx.caller);
  const revenueId = str(ctx.data.revenueId);
  const status = str(ctx.data.status);
  if (!revenueId || !status) throw new ApiError("revenueId and status are required");
  const { data, error } = await ctx.svc
    .from("revenue").update({ status }).eq("revenue_id", revenueId).select("*").maybeSingle();
  if (error) throw new ApiError(error.message, 500);
  if (!data) throw new ApiError("Revenue not found", 404);
  return camelizeRow(data);
}

export async function deleteRevenue(ctx: Ctx) {
  requireAdmin(ctx.caller);
  const revenueId = str(ctx.data.revenueId);
  if (!revenueId) throw new ApiError("revenueId is required");
  const { error } = await ctx.svc.from("revenue").delete().eq("revenue_id", revenueId);
  if (error) throw new ApiError(error.message, 500);
  return { deleted: true, revenueId };
}

export async function getExpenses(ctx: Ctx) {
  requireAdmin(ctx.caller);
  await materializeRecurringExpenses(ctx.svc);
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

export async function updateExpense(ctx: Ctx) {
  requireAdmin(ctx.caller);
  const expenseId = str(ctx.data.expenseId);
  if (!expenseId) throw new ApiError("expenseId is required");
  const f = ctx.data;
  const patch: Record<string, unknown> = {};
  if (f.expenseDate !== undefined) patch.expense_date = str(f.expenseDate);
  if (f.amount !== undefined) patch.amount = numOrNull(f.amount) ?? 0;
  if (f.category !== undefined) patch.category = str(f.category);
  if (f.description !== undefined) patch.description = str(f.description) || null;
  const { data, error } = await ctx.svc
    .from("expenses").update(patch).eq("expense_id", expenseId).select("*").maybeSingle();
  if (error) throw new ApiError(error.message, 500);
  if (!data) throw new ApiError("Expense not found", 404);
  return camelizeRow(data);
}

export async function deleteExpense(ctx: Ctx) {
  requireAdmin(ctx.caller);
  const expenseId = str(ctx.data.expenseId);
  if (!expenseId) throw new ApiError("expenseId is required");
  const { error } = await ctx.svc.from("expenses").delete().eq("expense_id", expenseId);
  if (error) throw new ApiError(error.message, 500);
  return { deleted: true, expenseId };
}

export async function getReserveLedger(ctx: Ctx) {
  requireAdmin(ctx.caller);
  const { data, error } = await ctx.svc
    .from("reserve_ledger").select("*").order("created_at", { ascending: false });
  if (error) throw new ApiError(error.message, 500);
  return camelizeRows(data);
}

/* ------------------------------ Recurring expenses ------------------------- */

function clampDay(n: number) {
  return Math.min(28, Math.max(1, Math.round(n || 1)));
}

function currentKarachiMonth(): string {
  const p = karachiParts(new Date());
  return `${p.year}-${String(p.month + 1).padStart(2, "0")}`;
}

function normalizeMonth(value: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(value || "");
  return m ? `${m[1]}-${m[2]}` : "";
}

/** Inclusive list of 'YYYY-MM' from start..end, clamped to the most recent `cap`. */
function monthRange(startYm: string, endYm: string, cap: number): string[] {
  const [sy, sm] = startYm.split("-").map(Number);
  const [ey, em] = endYm.split("-").map(Number);
  let startIdx = sy * 12 + (sm - 1);
  const endIdx = ey * 12 + (em - 1);
  if (endIdx < startIdx) return [];
  // Only ever generate the most recent `cap` months to avoid a runaway backfill.
  startIdx = Math.max(startIdx, endIdx - (cap - 1));
  const out: string[] = [];
  for (let i = startIdx; i <= endIdx; i++) {
    out.push(`${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`);
  }
  return out;
}

/**
 * Expand every active recurring template into one real expense per month, from
 * its start month up to the current month. Idempotent: a unique index on
 * (recurring_id, source_period) means already-posted months are skipped. Never
 * throws — a materialize failure must not take down the expenses page.
 */
export async function materializeRecurringExpenses(svc: SupabaseClient) {
  try {
    const { data: templates } = await svc
      .from("recurring_expenses").select("*").eq("active", true);
    if (!templates || templates.length === 0) return;

    const currentYm = currentKarachiMonth();
    const rows: Record<string, unknown>[] = [];
    for (const t of templates) {
      const start = normalizeMonth(str(t.start_month));
      if (!start) continue;
      for (const ym of monthRange(start, currentYm, 24)) {
        const [y, m] = ym.split("-").map(Number);
        const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
        const day = Math.min(clampDay(Number(t.day_of_month)), lastDay);
        rows.push({
          expense_date: `${ym}-${String(day).padStart(2, "0")}`,
          amount: Number(t.amount) || 0,
          category: t.category,
          description: t.description ?? null,
          created_by: t.created_by ?? "recurring",
          recurring_id: t.recurring_id,
          source_period: ym,
        });
      }
    }
    if (rows.length === 0) return;
    await svc.from("expenses").upsert(rows, {
      onConflict: "recurring_id,source_period",
      ignoreDuplicates: true,
    });
  } catch (err) {
    console.error("materializeRecurringExpenses failed:", err);
  }
}

export async function getRecurringExpenses(ctx: Ctx) {
  requireAdmin(ctx.caller);
  await materializeRecurringExpenses(ctx.svc);
  const { data, error } = await ctx.svc
    .from("recurring_expenses").select("*").order("created_at", { ascending: false });
  if (error) throw new ApiError(error.message, 500);
  return camelizeRows(data);
}

export async function createRecurringExpense(ctx: Ctx) {
  const caller = requireAdmin(ctx.caller);
  const row = {
    amount: numOrNull(ctx.data.amount) ?? 0,
    category: str(ctx.data.category),
    description: str(ctx.data.description) || null,
    day_of_month: clampDay(numOrNull(ctx.data.dayOfMonth) ?? 1),
    start_month: normalizeMonth(str(ctx.data.startMonth)) || currentKarachiMonth(),
    active: ctx.data.active === undefined ? true : bool(ctx.data.active),
    created_by: caller.username,
  };
  if (!row.category) throw new ApiError("category is required");
  const { data, error } = await ctx.svc
    .from("recurring_expenses").insert(row).select("*").single();
  if (error) throw new ApiError(error.message, 500);
  await materializeRecurringExpenses(ctx.svc);
  return camelizeRow(data);
}

export async function updateRecurringExpense(ctx: Ctx) {
  requireAdmin(ctx.caller);
  const recurringId = str(ctx.data.recurringId);
  if (!recurringId) throw new ApiError("recurringId is required");
  const f = ctx.data;
  const patch: Record<string, unknown> = {};
  if (f.amount !== undefined) patch.amount = numOrNull(f.amount) ?? 0;
  if (f.category !== undefined) patch.category = str(f.category);
  if (f.description !== undefined) patch.description = str(f.description) || null;
  if (f.dayOfMonth !== undefined) patch.day_of_month = clampDay(numOrNull(f.dayOfMonth) ?? 1);
  if (f.startMonth !== undefined) patch.start_month = normalizeMonth(str(f.startMonth)) || currentKarachiMonth();
  if (f.active !== undefined) patch.active = bool(f.active);
  const { data, error } = await ctx.svc
    .from("recurring_expenses").update(patch).eq("recurring_id", recurringId).select("*").maybeSingle();
  if (error) throw new ApiError(error.message, 500);
  if (!data) throw new ApiError("Recurring expense not found", 404);
  await materializeRecurringExpenses(ctx.svc);
  return camelizeRow(data);
}

export async function deleteRecurringExpense(ctx: Ctx) {
  requireAdmin(ctx.caller);
  const recurringId = str(ctx.data.recurringId);
  if (!recurringId) throw new ApiError("recurringId is required");
  // Already-posted expenses keep their row (recurring_id is set null by the FK).
  const { error } = await ctx.svc
    .from("recurring_expenses").delete().eq("recurring_id", recurringId);
  if (error) throw new ApiError(error.message, 500);
  return { deleted: true, recurringId };
}

/** Summary + 6-month trend + profit distribution. */
export async function getAccountsOverview(ctx: Ctx) {
  requireAdmin(ctx.caller);
  const svc = ctx.svc;
  await materializeRecurringExpenses(svc);

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
