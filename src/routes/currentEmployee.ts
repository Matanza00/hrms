/**
 * DEPRECATED. Prefer `useAuth()` from "@/lib/auth/AuthContext" inside components.
 *
 * These exports are kept only so older code that imported the hardcoded
 * constants keeps compiling. They are read ONCE from the stored session at
 * import time, are empty during SSR, and do NOT update reactively when the
 * user logs in/out. Migrate call sites to useAuth().employeeCode /
 * useAuth().employeeId.
 */
import { getStoredSession } from "./auth/session";

const session = getStoredSession();

export const CURRENT_EMPLOYEE_CODE =
  session?.employee?.employeeCode ?? session?.user.username ?? "";

export const CURRENT_EMPLOYEE_ID = session?.user.employeeId ?? "";
