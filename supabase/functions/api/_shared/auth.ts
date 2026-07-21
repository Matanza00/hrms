import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "./errors.ts";
import { serviceClient } from "./supabase.ts";

// Employees log in with a username / employee code, not an email. We give each
// Auth account a deterministic synthetic email so login can resolve it without
// storing a separate mapping. Keep this convention in sync with the bootstrap
// and create-employee code paths.
export const AUTH_EMAIL_DOMAIN = "lds.local";
export function authEmailFor(username: string): string {
  return `${String(username).trim().toLowerCase()}@${AUTH_EMAIL_DOMAIN}`;
}

export type Role = "Admin" | "Employee";

export type Caller = {
  userId: string;
  username: string;
  role: Role;
  employeeId: string | null;
  employeeCode: string | null;
  active: boolean;
};

/**
 * Resolve the authenticated caller from the Bearer token (Authorization header)
 * or an explicit body token (login/me/changePassword send it in the body).
 * Returns null when there is no valid session.
 */
export async function resolveCaller(
  req: Request,
  bodyToken?: string,
): Promise<Caller | null> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const headerToken = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";
  const token = (bodyToken && String(bodyToken)) || headerToken;
  if (!token) return null;

  const svc = serviceClient();
  const { data: userRes, error } = await svc.auth.getUser(token);
  if (error || !userRes?.user) return null;

  const { data: profile } = await svc
    .from("users")
    .select("username, role, employee_id, active, employees(employee_code)")
    .eq("id", userRes.user.id)
    .maybeSingle();
  if (!profile) return null;

  const employees = profile.employees as { employee_code?: string } | null;
  return {
    userId: userRes.user.id,
    username: profile.username as string,
    role: profile.role as Role,
    employeeId: (profile.employee_id as string | null) ?? null,
    employeeCode: employees?.employee_code ?? null,
    active: Boolean(profile.active),
  };
}

export function requireCaller(caller: Caller | null): Caller {
  if (!caller) throw new ApiError("Not authenticated", 401);
  if (!caller.active) throw new ApiError("Account is disabled", 403);
  return caller;
}

export function requireAdmin(caller: Caller | null): Caller {
  const c = requireCaller(caller);
  if (c.role !== "Admin") throw new ApiError("Admin access required", 403);
  return c;
}

/**
 * The employee a self-service action operates on. Employees always act as
 * themselves; an Admin may act on behalf of anyone by passing employeeCode.
 * Returns the resolved employee row.
 */
export async function resolveActingEmployee(
  svc: SupabaseClient,
  caller: Caller,
  bodyEmployeeCode?: string,
): Promise<{ employee_id: string; employee_code: string; name: string }> {
  let query = svc.from("employees").select("employee_id, employee_code, name").limit(1);

  if (caller.role === "Admin" && bodyEmployeeCode) {
    query = query.eq("employee_code", bodyEmployeeCode);
  } else if (caller.employeeId) {
    query = query.eq("employee_id", caller.employeeId);
  } else {
    throw new ApiError("Your account is not linked to an employee record", 403);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw new ApiError(error.message, 500);
  if (!data) throw new ApiError("Employee not found", 404);
  return data as { employee_id: string; employee_code: string; name: string };
}
