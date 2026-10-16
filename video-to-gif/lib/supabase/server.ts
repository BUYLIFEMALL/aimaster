import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { cookieDomainForHost } from "./cookieDomain";

export async function createClient() {
  const cookieStore = await cookies();
  // 2026-10-16 도메인 통일(SSO): *.buylife.xyz에서는 로그인 쿠키를 .buylife.xyz로 공유한다
  const cookieDomain = cookieDomainForHost(headers().get("x-forwarded-host") ?? headers().get("host"));
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim())!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: (items) => { try { items.forEach(({ name, value, options }) => cookieStore.set(name, value, cookieDomain ? { ...options, domain: cookieDomain } : options)); } catch {} } } },
  );
}
