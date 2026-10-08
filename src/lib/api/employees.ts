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
  endDate?: string;
  status:
    | "Permanent"
    | "Contract"
    | "Intern"
    | "Probation"
    | "Notice Period"
    | "Resigned";
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

export const getEmployee = (employeeId: string) =>
  apiGet<Employee>("employee", { employeeId });

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