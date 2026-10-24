import { createBrowserClient } from "@supabase/ssr";
import { cookieDomainForHost } from "./cookieDomain";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim())!,
    {
      cookieOptions: {
        domain: typeof window === "undefined" ? undefined : cookieDomainForHost(window.location.hostname),
      },
    },
  );
}
