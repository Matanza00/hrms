import { getToken } from "./auth/session";

// Base URL of the Supabase Edge Function ("api"). Same single-endpoint contract
// the app has always used: GET ?action=... and POST { action, data }.
const API_URL = import.meta.env.VITE_API_URL || "";
// Supabase anon key — required by the platform gateway to route to the function.
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

/**
 * Headers every call carries:
 *  - `apikey`: the anon key, so Supabase's gateway accepts the request.
 *  - `Authorization`: the logged-in user's JWT (falls back to the anon key when
 *    signed out, e.g. the login call). The Edge Function reads this to identify
 *    and authorize the caller.
 */
function authHeaders(): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token || ANON_KEY}`,
  };
  if (ANON_KEY) headers.apikey = ANON_KEY;
  return headers;
}

export async function apiGet<T>(
  action: string,
  params: Record<string, string> = {}
): Promise<T> {
  const query = new URLSearchParams({ action, ...params });
  const url = `${API_URL}?${query.toString()}`;

  const res = await fetch(url, { headers: authHeaders() });
  const json = await res.json();

  if (!json.success) {
    throw new Error(json.error || json.message || "API error");
  }

  return (json.data ?? []) as T;
}

export async function apiPost<T>(action: string, data: unknown): Promise<T> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ action, data }),
  });

  const json = await res.json();

  if (!json.success) {
    throw new Error(json.error || json.message || "API error");
  }

  return (json.data ?? {}) as T;
}
