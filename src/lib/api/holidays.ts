import { apiGet, apiPost } from "../apiClient";

export type Holiday = {
  holidayId: string;
  title: string;
  holidayDate: string;
  holidayType: "Public" | "Religious" | "Company" | string;
  calendarEventId?: string;
  createdAt?: string;
};

export const getHolidays = () => apiGet<Holiday[]>("holidays");

export const createHoliday = (data: { title: string; holidayDate: string; holidayType: string }) =>
  apiPost<Holiday>("createHoliday", data);
