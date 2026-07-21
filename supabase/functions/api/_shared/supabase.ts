import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// SUPABASE_URL / _ANON_KEY / _SERVICE_ROLE_KEY are injected into every Edge
// Function at runtime — no need to set them yourself.
const url = () => Deno.env.get("SUPABASE_URL")!;

/** Full-access client. Bypasses RLS — the handler is responsible for authz. */
export function serviceClient(): SupabaseClient {
  return createClient(url(), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Anon client, used for signInWithPassword during login. */
export function anonClient(): SupabaseClient {
  return createClient(url(), Deno.env.get("SUPABASE_ANON_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
