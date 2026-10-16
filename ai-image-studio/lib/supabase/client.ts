import { createBrowserClient } from "@supabase/ssr";
import { cookieDomainForHost } from "./cookieDomain";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://esgxyikcnnvmlhygjkth.supabase.co";
const SUPABASE_ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()) || "sb_publishable_dpa8WnGOUodpmS7_eNy91g_G-smJrml";

export function createClient() {
  return createBrowserClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookieOptions: {
        domain: typeof window === "undefined" ? undefined : cookieDomainForHost(window.location.hostname),
      },
    },
  );
}
