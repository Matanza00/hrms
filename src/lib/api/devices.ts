import { apiGet, apiPost } from "../apiClient";
import type { AttendanceRecord } from "./attendance";

/** A phone registered to an employee for QR attendance. */
export type EmployeeDevice = {
  deviceId: string;
  employeeId: string;
  employeeName?: string;
  label?: string;
  active: boolean;
  registeredAt: string;
  lastSeenAt?: string;
};

export type ScanResult = {
  /** What the scan recorded: the start or the end of the shift. */
  action: "checkIn" | "checkOut";
  /** True when this scan registered the phone (the employee's first scan). */
  deviceRegistered: boolean;
  employeeName?: string;
  attendance: AttendanceRecord;
};

export type ScanInput = {
  qrCode: string;
  deviceToken: string;
  deviceLabel: string;
  latitude?: number;
  longitude?: number;
  ipAddress?: string;
};

/** Mark attendance from a scan of the office QR poster. */
export const scanAttendance = (data: ScanInput) =>
  apiPost<ScanResult>("scanAttendance", data);

/** Admin: phones currently registered, one per employee. */
export const getEmployeeDevices = () =>
  apiGet<EmployeeDevice[]>("employeeDevices");

/** Admin: unbind an employee's phone so their next scan registers a new one. */
export const resetEmployeeDevice = (employeeId: string) =>
  apiPost<{ reset: number }>("resetEmployeeDevice", { employeeId });

/** Admin: the code printed on the office poster. */
export const getAttendanceQr = () => apiGet<{ code: string }>("attendanceQr");

/** Admin: issue a new code, retiring every printed poster. */
export const rotateAttendanceQr = () =>
  apiPost<{ code: string }>("rotateAttendanceQr", {});
