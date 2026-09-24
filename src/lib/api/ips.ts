import { apiGet, apiPost } from "../apiClient";

/** A network an employee is allowed to mark attendance from. */
export type EmployeeIp = {
  ipId: string;
  employeeId: string;
  employeeName?: string;
  ipAddress: string;
  label?: string;
  createdAt: string;
  lastUsedAt?: string;
};

/** The public address the current browser reaches the server from. */
export const whereAmI = () => apiGet<{ ip: string }>("whereAmI");

export const getEmployeeIps = () => apiGet<EmployeeIp[]>("employeeIps");

export const addEmployeeIp = (data: { employeeId: string; ipAddress: string; label?: string }) =>
  apiPost<EmployeeIp>("addEmployeeIp", data);

export const removeEmployeeIp = (ipId: string) =>
  apiPost<{ removed: boolean }>("removeEmployeeIp", { ipId });
