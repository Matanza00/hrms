import { apiGet, apiPost } from "../apiClient";

export type EmployeeDocument = {
  documentId: string;
  employeeId: string;
  title: string;
  category: string;
  filePath: string;
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
  uploadedBy?: string;
  createdAt?: string;
  /** Employee uploads wait for an admin; admin uploads are approved at once. */
  status?: "Pending" | "Approved" | "Rejected";
  reviewNote?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  /** Short-lived signed download URL, attached by the backend on read. */
  url?: string | null;
};

/** A document waiting for review, with who it belongs to. */
export type PendingDocument = EmployeeDocument & {
  employeeName?: string | null;
  employeeCode?: string | null;
};

export const getPendingDocuments = () => apiGet<PendingDocument[]>("pendingDocuments");

export const reviewEmployeeDocument = (data: {
  documentId: string;
  status: "Approved" | "Rejected";
  note?: string;
}) => apiPost<EmployeeDocument>("reviewEmployeeDocument", data);

export const getEmployeeDocuments = (employeeId: string) =>
  apiGet<EmployeeDocument[]>("employeeDocuments", { employeeId });

export const uploadEmployeeDocument = (data: {
  employeeId: string;
  title?: string;
  category?: string;
  fileName: string;
  mimeType: string;
  /** base64 (data: URL accepted) of the file contents. */
  dataBase64: string;
}) => apiPost<EmployeeDocument>("uploadEmployeeDocument", data);

export const deleteEmployeeDocument = (documentId: string) =>
  apiPost<{ deleted: boolean }>("deleteEmployeeDocument", { documentId });
