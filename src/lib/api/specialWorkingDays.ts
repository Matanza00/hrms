import { apiGet, apiPost } from "../apiClient";

export type SpecialWorkingDay = {
  workingDayId: string;
  title: string;
  workingDate: string;
  allEmployees: boolean | string;
  assignedEmployeeIds?: string;
  calendarEventId?: string;
  createdAt?: string;
};

export const getSpecialWorkingDays = () => apiGet<SpecialWorkingDay[]>("specialWorkingDays");

export const createSpecialWorkingDay = (data: {
  title: string;
  workingDate: string;
  allEmployees: boolean;
  assignedEmployeeIds: string;
}) => apiPost<SpecialWorkingDay>("createSpecialWorkingDay", data);
