import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { cookieDomainForHost } from "./cookieDomain";

export async function createClient() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const cookieDomain = cookieDomainForHost(
    headerStore.get("x-forwarded-host") ?? headerStore.get("host")
  );

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
              cookieStore.set(
                name,
                value,
                cookieDomain ? { ...options, domain: cookieDomain } : options
              )
            );
          } catch {
            // Server Component에서 호출된 경우 setAll은 무시
          }
        },
      },
      // 로그인 정책(2026-11-13): 서버가 대신 로그인할 때 브라우저 기기 정보를 넘겨 PC/모바일 동시 접속 제한에 맞춤
      global: { headers: { "User-Agent": headerStore.get("user-agent") ?? "" } },
    }
  );
}
