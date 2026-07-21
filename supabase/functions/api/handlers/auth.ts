import type { SupabaseClient } from "@supabase/supabase-js";
import type { Ctx } from "../_shared/context.ts";
import { str } from "../_shared/context.ts";
import { anonClient, serviceClient } from "../_shared/supabase.ts";
import { authEmailFor, resolveCaller } from "../_shared/auth.ts";
import { ApiError } from "../_shared/errors.ts";
import { camelizeRow } from "../_shared/case.ts";

type UserRow = {
  id: string;
  username: string;
  role: "Admin" | "Employee";
  employee_id: string | null;
  active: boolean;
};

const USER_COLS = "id, username, role, employee_id, active";

/** Find a user by username OR by their employee code (both are valid login IDs). */
async function findUserByLoginId(
  svc: SupabaseClient,
  loginId: string,
): Promise<UserRow | null> {
  const byUsername = await svc
    .from("users")
    .select(USER_COLS)
    .ilike("username", loginId)
    .maybeSingle();
  if (byUsername.data) return byUsername.data as UserRow;

  const emp = await svc
    .from("employees")
    .select("employee_id")
    .ilike("employee_code", loginId)
    .maybeSingle();
  if (emp.data) {
    const byEmp = await svc
      .from("users")
      .select(USER_COLS)
      .eq("employee_id", emp.data.employee_id)
      .maybeSingle();
    return (byEmp.data as UserRow) ?? null;
  }
  return null;
}

async function buildSession(svc: SupabaseClient, token: string, u: UserRow) {
  let employee: unknown = null;
  if (u.employee_id) {
    const { data } = await svc
      .from("employees")
      .select("*")
      .eq("employee_id", u.employee_id)
      .maybeSingle();
    employee = camelizeRow(data);
  }
  return {
    token,
    user: {
      userId: u.id,
      username: u.username,
      role: u.role,
      employeeId: u.employee_id,
      active: u.active,
    },
    employee,
  };
}

function bearer(req: Request): string {
  const h = req.headers.get("Authorization") ?? "";
  return h.toLowerCase().startsWith("bearer ") ? h.slice(7).trim() : "";
}

export async function login(ctx: Ctx) {
  const loginId = str(ctx.data.loginId).trim();
  const password = str(ctx.data.password);
  if (!loginId || !password) throw new ApiError("Login and password are required");

  const svc = serviceClient();
  const user = await findUserByLoginId(svc, loginId);
  if (!user) throw new ApiError("Invalid credentials", 401);
  if (!user.active) throw new ApiError("Account is disabled", 403);

  const { data: signIn, error } = await anonClient().auth.signInWithPassword({
    email: authEmailFor(user.username),
    password,
  });
  if (error || !signIn.session) throw new ApiError("Invalid credentials", 401);

  return buildSession(svc, signIn.session.access_token, user);
}

export async function me(ctx: Ctx) {
  const caller = ctx.caller ?? (await resolveCaller(ctx.req, str(ctx.data.token)));
  if (!caller) throw new ApiError("Not authenticated", 401);

  const svc = serviceClient();
  const { data } = await svc.from("users").select(USER_COLS).eq("id", caller.userId).maybeSingle();
  if (!data) throw new ApiError("User not found", 404);

  const token = str(ctx.data.token) || bearer(ctx.req);
  return buildSession(svc, token, data as UserRow);
}

export async function changePassword(ctx: Ctx) {
  const caller = ctx.caller ?? (await resolveCaller(ctx.req, str(ctx.data.token)));
  if (!caller) throw new ApiError("Not authenticated", 401);

  const currentPassword = str(ctx.data.currentPassword);
  const newPassword = str(ctx.data.newPassword);
  if (newPassword.length < 6) {
    throw new ApiError("New password must be at least 6 characters");
  }

  // Verify the current password by attempting a sign-in.
  const { error: verifyErr } = await anonClient().auth.signInWithPassword({
    email: authEmailFor(caller.username),
    password: currentPassword,
  });
  if (verifyErr) throw new ApiError("Current password is incorrect", 401);

  const { error } = await serviceClient().auth.admin.updateUserById(caller.userId, {
    password: newPassword,
  });
  if (error) throw new ApiError(error.message, 500);
  return { message: "Password updated successfully" };
}
