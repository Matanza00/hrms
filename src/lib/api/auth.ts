import { apiPost } from "../apiClient";

export type AuthRole = "Admin" | "Employee";

export type AuthUser = {
  userId: string;
  username: string;
  role: AuthRole;
  employeeId: string;
  active: boolean;
};

export type AuthEmployee = {
  employeeId: string;
  employeeCode: string;
  name: string;
  email?: string;
  phone?: string;
  department?: string;
  designation?: string;
  [key: string]: unknown;
} | null;

export type AuthSession = {
  token: string;
  user: AuthUser;
  employee: AuthEmployee;
};

export const login = (loginId: string, password: string) =>
  apiPost<AuthSession>("login", { loginId, password });

export const fetchMe = (token: string) => apiPost<AuthSession>("me", { token });

/** Login page: ask an admin to reset this Login ID's password (no sign-in needed). */
export const requestPasswordReset = (loginId: string) =>
  apiPost<{ message: string }>("requestPasswordReset", { loginId });

/** Admins only; employees get their password set by an admin. */
export const changePassword = (token: string, currentPassword: string, newPassword: string) =>
  apiPost<{ message: string }>("changePassword", {
    token,
    currentPassword,
    newPassword,
  });
