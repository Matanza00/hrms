import { corsHeaders } from "./cors.ts";

// The frontend apiClient only looks at `json.success` / `json.data` / `json.error`
// (it ignores the HTTP status). We keep that exact envelope so the React app
// doesn't change.
export function jsonSuccess(data: unknown, status = 200): Response {
  return new Response(JSON.stringify({ success: true, data: data ?? null }), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}

export function jsonError(message: string, status = 400): Response {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}
