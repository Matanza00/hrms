import { apiGet, apiPost } from "../apiClient";

export type PayrollRecord = {
  payrollId: string;
  employeeId: string;
  employeeName?: string;
  month: string;

  basicSalary: number;
  fuelAllowance: number;
  opdAllowance: number;
  grossSalary: number;

  unpaidLeaveDays: number;

  lateFullDays: number;
  lateHalfDays: number;

  deficitFullDays: number;
  deficitHalfDays: number;

  sandwichDays: number;

  totalDeductionDays: number;
  deductionAmount: number;

  bonus: number;
  netSalary: number;

  status: "Generated" | "Paid" | "Cancelled" | string;

  generatedAt?: string;
  paidAt?: string;
};

export const getPayroll = () => apiGet<PayrollRecord[]>("payroll");

export const generatePayroll = (data: {
  employeeId?: string;
  employeeCode?: string;
  month: string;
  bonus?: number;
  recalculate?: boolean;
}) => apiPost<PayrollRecord>("generatePayroll", data);

export const markPayrollPaid = (data: { employeeId: string; month: string }) =>
  apiPost("markPayrollPaid", data);

export const cancelPayroll = (data: { employeeId: string; month: string }) =>
  apiPost("cancelPayroll", data);
