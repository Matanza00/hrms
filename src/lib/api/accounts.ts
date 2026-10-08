import { apiGet, apiPost } from "../apiClient";

export type Revenue = {
  revenueId: string;
  revenueDate: string;
  amount: number;
  category?: string;
  client?: string;
  source?: string;
  description?: string;
  status?: string;
  createdBy?: string;
  createdAt?: string;
};

export const getRevenue = () => apiGet<Revenue[]>("revenue");

export const createRevenue = (data: {
  revenueDate: string;
  amount: number;
  category?: string;
  client?: string;
  source?: string;
  description?: string;
}) => apiPost<Revenue>("createRevenue", data);

export const updateRevenue = (data: {
  revenueId: string;
  revenueDate?: string;
  amount?: number;
  category?: string;
  client?: string;
  source?: string;
  description?: string;
  status?: string;
}) => apiPost<Revenue>("updateRevenue", data);

export const setRevenueStatus = (data: { revenueId: string; status: string }) =>
  apiPost<Revenue>("setRevenueStatus", data);

export const deleteRevenue = (revenueId: string) =>
  apiPost<{ deleted: boolean }>("deleteRevenue", { revenueId });

export type AccountsSummary = {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  reserveBalance: number;
};

export type ProfitDistributionItem = {
  name: string;
  percent: number;
  amount: number;
};

export type RevenueExpenseTrendItem = {
  month: string;
  revenue: number;
  expense: number;
};

export type AccountsOverview = {
  summary: AccountsSummary;
  trend: RevenueExpenseTrendItem[];
  distribution: ProfitDistributionItem[];
};

export const getAccountsOverview = () =>
  apiGet<AccountsOverview>("accountsOverview");

export type ReserveTransaction = {
  reserveId: string;
  transactionDate: string;
  transactionType: "Credit" | "Debit" | "credit" | "debit";
  amount: number;
  balanceAfter: number;
  description?: string;
  createdAt?: string;
};

export const getReserveLedger = () =>
  apiGet<ReserveTransaction[]>("reserveLedger");



export type Expense = {
  expenseId: string;
  expenseDate: string;
  amount: number;
  category: "Salary" | "Utilities" | "Tools" | "Emergency" | "Misc" | "Reserve" | string;
  description?: string;
  createdBy?: string;
  createdAt?: string;
  /** Set when this expense was auto-posted from a recurring template. */
  recurringId?: string | null;
  sourcePeriod?: string | null;
};

export const getExpenses = () =>
  apiGet<Expense[]>("expenses");

export const createExpense = (data: {
  expenseDate: string;
  amount: number;
  category: string;
  description?: string;
}) => apiPost<Expense>("createExpense", data);

export const updateExpense = (data: {
  expenseId: string;
  expenseDate?: string;
  amount?: number;
  category?: string;
  description?: string;
}) => apiPost<Expense>("updateExpense", data);

export const deleteExpense = (expenseId: string) =>
  apiPost<{ deleted: boolean }>("deleteExpense", { expenseId });

/* ------------------------------ Recurring expenses ------------------------- */

export type RecurringExpense = {
  recurringId: string;
  amount: number;
  category: string;
  description?: string;
  dayOfMonth: number;
  startMonth: string; // "YYYY-MM"
  active: boolean;
  createdBy?: string;
  createdAt?: string;
};

export const getRecurringExpenses = () =>
  apiGet<RecurringExpense[]>("recurringExpenses");

export const createRecurringExpense = (data: {
  amount: number;
  category: string;
  description?: string;
  dayOfMonth: number;
  startMonth: string;
  active?: boolean;
}) => apiPost<RecurringExpense>("createRecurringExpense", data);

export const updateRecurringExpense = (data: {
  recurringId: string;
  amount?: number;
  category?: string;
  description?: string;
  dayOfMonth?: number;
  startMonth?: string;
  active?: boolean;
}) => apiPost<RecurringExpense>("updateRecurringExpense", data);

export const deleteRecurringExpense = (recurringId: string) =>
  apiPost<{ deleted: boolean }>("deleteRecurringExpense", { recurringId });