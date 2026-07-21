// Tiny service-role client over plain fetch (no npm dependency needed).
// Reads SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY from the environment and falls
// back to the well-known LOCAL dev values. For a CLOUD project you MUST export
// the real service_role key first (never commit it).

const URL = process.env.SUPABASE_URL || "http://127.0.0.1:54321";

// Well-known local-dev service_role key (matches the default local JWT secret).
const LOCAL_SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UtZGVtbyIsImlhdCI6MTY0MTc2OTIwMCwiZXhwIjoxNzk5NTM1NjAwfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q";

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || LOCAL_SERVICE_KEY;

export const AUTH_EMAIL_DOMAIN = "lds.local";
export const authEmailFor = (u) => `${String(u).trim().toLowerCase()}@${AUTH_EMAIL_DOMAIN}`;

const headers = () => ({
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
});

/** Create a confirmed Auth user; returns { id, ... }. */
export async function adminCreateUser({ email, password }) {
  const res = await fetch(`${URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Auth create failed for ${email}: ${JSON.stringify(json)}`);
  return json;
}

/** Look up an Auth user id by email (used to make imports re-runnable). */
export async function adminFindUserByEmail(email) {
  const res = await fetch(`${URL}/auth/v1/admin/users?per_page=200`, { headers: headers() });
  if (!res.ok) return null;
  const json = await res.json().catch(() => ({}));
  const list = json.users || json || [];
  return list.find((u) => (u.email || "").toLowerCase() === email.toLowerCase()) || null;
}

/** Thin PostgREST wrapper. */
export async function rest(path, { method = "GET", body, prefer } = {}) {
  const res = await fetch(`${URL}/rest/v1/${path}`, {
    method,
    headers: { ...headers(), ...(prefer ? { Prefer: prefer } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(`REST ${method} ${path} failed: ${text}`);
  return json;
}
