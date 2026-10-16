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

export const getAccountsOverview = () => apiGet<AccountsOverview>("accountsOverview");

export type ReserveTransaction = {
  reserveId: string;
  transactionDate: string;
  transactionType: "Credit" | "Debit" | "credit" | "debit";
  amount: number;
  balanceAfter: number;
  description?: string;
  createdAt?: string;
};

export const getReserveLedger = () => apiGet<ReserveTransaction[]>("reserveLedger");

export type Expense = {
  expenseId: string;
  expenseDate: string;
  amount: number;
  category: "Salary" | "Utilities" | "Tools" | "Emergency" | "Misc" | "Reserve" | string;
  description?: string;
  createdBy?: string;
  createdAt?: string;
};

export const getExpenses = () => apiGet<Expense[]>("expenses");

export const createExpense = (data: {
  expenseDate: string;
  amount: number;
  category: string;
  description?: string;
}) => apiPost<Expense>("createExpense", data);
