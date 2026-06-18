import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  login as apiLogin,
  fetchMe,
  type AuthEmployee,
  type AuthRole,
  type AuthSession,
  type AuthUser,
} from "@/lib/api/auth";
import {
  clearStoredSession,
  getStoredSession,
  setStoredSession,
} from "./session";

type Status = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  status: Status;
  user: AuthUser | null;
  employee: AuthEmployee;
  role: AuthRole | null;
  /** The linked employee's id (from the token/user). */
  employeeId: string | null;
  /**
   * The employee code used by attendance/leave mutations. Falls back to the
   * username for Employee logins (we seed username = employeeCode).
   */
  employeeCode: string | null;
  login: (loginId: string, password: string) => Promise<AuthSession>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [session, setSession] = useState<AuthSession | null>(null);

  // Load + validate the stored session on the client after hydration.
  useEffect(() => {
    const stored = getStoredSession();

    if (!stored) {
      setStatus("unauthenticated");
      return;
    }

    // Optimistically trust the stored session so there's no flash of login,
    // then revalidate the token against the server in the background.
    setSession(stored);
    setStatus("authenticated");

    fetchMe(stored.token)
      .then((fresh) => {
        setSession(fresh);
        setStoredSession(fresh);
        setStatus("authenticated");
      })
      .catch(() => {
        clearStoredSession();
        setSession(null);
        setStatus("unauthenticated");
      });
  }, []);

  async function login(loginId: string, password: string) {
    const fresh = await apiLogin(loginId, password);
    setStoredSession(fresh);
    setSession(fresh);
    setStatus("authenticated");
    return fresh;
  }

  function logout() {
    clearStoredSession();
    setSession(null);
    setStatus("unauthenticated");
  }

  const role = session?.user.role ?? null;

  const employeeCode =
    session?.employee?.employeeCode ??
    (role === "Employee" ? session?.user.username ?? null : null);

  const value: AuthContextValue = {
    status,
    user: session?.user ?? null,
    employee: session?.employee ?? null,
    role,
    employeeId: session?.user.employeeId ?? null,
    employeeCode,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth must be used within <AuthProvider>");
  }

  return ctx;
}
