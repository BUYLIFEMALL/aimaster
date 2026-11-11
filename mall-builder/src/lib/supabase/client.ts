import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_KEY, SUPABASE_URL } from "./env";
import { cookieDomainForHost } from "./cookieDomain";

export function createClient() {
  // *.buylife.xyz(운영)에서는 메인 사이트와 로그인 쿠키를 공유한다. Lab(vercel.app)·내 PC는 그대로
  const domain = typeof window !== "undefined" ? cookieDomainForHost(window.location.host) : undefined;
  return createBrowserClient(SUPABASE_URL, SUPABASE_KEY, domain ? { cookieOptions: { domain } } : undefined);
}
