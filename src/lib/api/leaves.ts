import { apiGet, apiPost } from "../apiClient";

export type LeaveRequest = {
  leaveId: string;
  employeeId: string;
  employeeName?: string;
  leaveType: "Annual" | "Casual" | "Sick" | "Unpaid" | string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason?: string;
  status: string;
  paidDays?: number;
  unpaidDays?: number;
  approvedBy?: string;
  approvedAt?: string;
  comments?: string;
  createdAt?: string;
  updatedAt?: string;
};

export const getLeaveRequests = () =>
  apiGet<LeaveRequest[]>("leaveRequests");

export const applyLeave = (data: {
  employeeCode: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason?: string;
}) => apiPost<LeaveRequest>("applyLeave", data);

/** Fields an admin can set when backfilling or correcting a leave record. */
export type AdminLeaveInput = {
  employeeId?: string;
  employeeCode?: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  paidDays?: number;
  unpaidDays?: number;
  status?: string;
  reason?: string;
};

/** Admin-only: add a historical/backdated leave (defaults to Approved). */
export const adminAddLeave = (data: AdminLeaveInput) =>
  apiPost<LeaveRequest>("adminAddLeave", data);

/** Admin-only: correct an existing leave record. */
export const adminUpdateLeave = (leaveId: string, data: Partial<AdminLeaveInput>) =>
  apiPost<LeaveRequest>("adminUpdateLeave", { leaveId, data });