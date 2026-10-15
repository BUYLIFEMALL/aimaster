import "server-only";

/** Server-only platform credential; never import this module into a browser component. */
export function getSupabaseSecretKey() {
  return process.env.SUPABASE_SECRET_KEY?.trim()
    || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    || "";
}
