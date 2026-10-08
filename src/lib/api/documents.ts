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
  /** Short-lived signed download URL, attached by the backend on read. */
  url?: string | null;
};

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
