import { getSupabasePublicKey } from "./supabase/env";
import { getSupabaseSecretKey } from "./supabase/serverEnv";

export function platformConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && getSupabasePublicKey() && getSupabaseSecretKey());
}
