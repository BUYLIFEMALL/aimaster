import { createBrowserClient } from "@supabase/ssr";
import { cookieDomainForHost } from "./cookieDomain";
import { getSupabasePublicKey } from "./env";

export function createClient() {
  const cookieDomain =
    typeof window !== "undefined"
      ? cookieDomainForHost(window.location.host)
      : undefined;

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    getSupabasePublicKey(),
    {
      cookieOptions: cookieDomain ? { domain: cookieDomain } : undefined,
    }
  );
}
