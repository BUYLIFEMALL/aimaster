import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { cookieDomainForHost } from "./cookieDomain";

export async function createClient() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const cookieDomain = cookieDomainForHost(headerStore.get("x-forwarded-host") ?? headerStore.get("host"));

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim())!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, cookieDomain ? { ...options, domain: cookieDomain } : options)
            );
          } catch {
            // Server Component에서는 쿠키 변경이 제한될 수 있습니다.
          }
        },
      },
      // 로그인 정책: 서버가 대신 로그인할 때 브라우저 기기 정보를 넘긴다(docs/HANDOFF_20261113_LOGIN_POLICY_ROLLOUT.md 2-2).
      global: { headers: { "User-Agent": headerStore.get("user-agent") ?? "" } },
    }
  );
}