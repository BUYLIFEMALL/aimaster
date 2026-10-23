import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database.types";
import { cookieDomainForHost } from "./cookieDomain";

export function createClient() {
  const cookieDomain = typeof window !== "undefined" ? cookieDomainForHost(window.location.host) : undefined;
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim())!,
    { cookieOptions: cookieDomain ? { domain: cookieDomain } : undefined },
  );
}
