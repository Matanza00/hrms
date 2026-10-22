import { apiGet, apiPost } from "../apiClient";

export type Employee = {
  employeeId: string;
  employeeCode: string;
  name: string;
  email: string;
  phone: string;
  cnic: string;
  dob: string;
  joiningDate: string;
  permanentDate: string;
  /** Null clears it (the employee is back at LDS). */
  endDate?: string | null;
  status:
    "Permanent" | "Contract" | "Intern" | "Probation" | "Notice Period" | "Resigned" | "Terminated";
  department: string;
  designation: string;
  basicSalary: number;
  fuelAllowance: number;
  opdAllowance: number;
  address: string;
  emergencyContact: string;
  active: boolean | string;
};

export const getEmployees = () => apiGet<Employee[]>("employees");

export const getEmployee = (employeeId: string) => apiGet<Employee>("employee", { employeeId });

export const createEmployee = (data: Partial<Employee>) =>
  apiPost<Employee>("createEmployee", data);

export function updateEmployee(employeeId: string, data: Partial<Employee>) {
  return apiPost<Employee>("updateEmployee", {
    employeeId,
    data,
  });
}

export const deactivateEmployee = (employeeId: string) =>
  apiPost("deactivateEmployee", { employeeId });

/** Admin only: set a new password on this employee's login. */
export const setEmployeePassword = (employeeId: string, newPassword: string) =>
  apiPost<{ message: string }>("setEmployeePassword", { employeeId, newPassword });

/** An employee asked (from the login page) for their password to be reset. */
export type PasswordResetRequest = {
  requestId: string;
  employeeId: string;
  employeeName: string | null;
  employeeCode: string | null;
  status: "Pending" | "Resolved" | "Dismissed";
  requestedAt: string;
};

export const getPasswordResetRequests = () =>
  apiGet<PasswordResetRequest[]>("passwordResetRequests");

export const dismissPasswordResetRequest = (requestId: string) =>
  apiPost<{ dismissed: boolean }>("dismissPasswordResetRequest", { requestId });
