import { createBrowserClient } from "@supabase/ssr";
import { cookieDomainForHost } from "./cookieDomain";

export function createClient() {
  const cookieDomain =
    typeof window !== "undefined"
      ? cookieDomainForHost(window.location.host)
      : undefined;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://esgxyikcnnvmlhygjkth.supabase.co";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder";

  return createBrowserClient(
    url,
    anonKey,
    {
      cookieOptions: cookieDomain ? { domain: cookieDomain } : undefined,
    }
  );
}
