import { apiGet, apiPost } from "../apiClient";

/** A resignation or termination. See handlers/separations.ts for the flow. */
export type Separation = {
  separationId: string;
  employeeId: string;
  employeeName?: string | null;
  type: "Resignation" | "Termination";
  status: "Pending" | "Approved" | "Rejected" | "Cancelled" | "Completed";
  reason?: string | null;
  noticeDate: string;
  requestedLastDay?: string | null;
  lastWorkingDay?: string | null;
  previousStatus?: string | null;
  adminNote?: string | null;
  createdBy?: string | null;
  createdAt?: string;
  decidedBy?: string | null;
  decidedAt?: string | null;
  completedAt?: string | null;
};

/** Admin: every separation, or one employee's. */
export const getSeparations = (employeeId?: string) =>
  apiGet<Separation[]>("separations", employeeId ? { employeeId } : {});

/** Employee: their own latest separation (null if none). apiGet turns a null
 *  payload into [], so anything that isn't a separation means "none". */
export const getMySeparation = () =>
  apiGet<Separation | null>("mySeparation").then((s) =>
    s && !Array.isArray(s) && s.separationId ? s : null,
  );

export const submitResignation = (data: { reason: string; requestedLastDay: string }) =>
  apiPost<Separation>("submitResignation", data);

export const recordSeparation = (data: {
  employeeId: string;
  type: "Resignation" | "Termination";
  noticeDate: string;
  lastWorkingDay: string;
  reason?: string;
  note?: string;
}) => apiPost<Separation>("recordSeparation", data);

export const decideResignation = (data: {
  separationId: string;
  decision: "approve" | "reject";
  lastWorkingDay?: string;
  note?: string;
}) => apiPost<Separation>("decideResignation", data);

export const cancelSeparation = (data: { separationId: string; note?: string }) =>
  apiPost<Separation>("cancelSeparation", data);
