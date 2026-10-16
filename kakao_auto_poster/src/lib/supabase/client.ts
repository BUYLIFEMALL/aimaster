import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database.types";
import { cookieDomainForHost } from "./cookieDomain";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim())!,
    {
      cookieOptions: {
        domain: typeof window === "undefined" ? undefined : cookieDomainForHost(window.location.hostname),
      },
    },
  );
}
