// The React app runs on a different origin than the Edge Function, so every
// response needs CORS headers and we must answer the OPTIONS preflight.
export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export function preflight(): Response {
  return new Response("ok", { headers: corsHeaders });
}
