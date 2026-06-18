import type { AuthSession } from "@/lib/api/auth";

const KEY = "lds_auth_session";

export function getStoredSession(): AuthSession | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

export function setStoredSession(session: AuthSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(session));
}

export function clearStoredSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}

/** Convenience for any future authed API calls that need to send the token. */
export function getToken(): string | null {
  return getStoredSession()?.token ?? null;
}
