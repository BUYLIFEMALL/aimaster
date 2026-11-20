import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { cookieDomainForHost } from "./cookieDomain";
import type { Database } from "@/types/database.types";

export async function createClient() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const cookieDomain = cookieDomainForHost(headerStore.get("x-forwarded-host") ?? headerStore.get("host"));
  // 서버가 대신 로그인할 때 브라우저 기기 정보를 넘김(동시 접속 제한 기록) — docs/HANDOFF_20261113_LOGIN_POLICY_ROLLOUT.md 2-2
  const ua = headerStore.get("user-agent") ?? "";

  return createServerClient<Database>(
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
              cookieStore.set(name, value, cookieDomain ? { ...options, domain: cookieDomain } : options),
            );
          } catch {
            // Server Component ignore
          }
        },
      },
      global: { headers: { "User-Agent": ua } },
    },
  );
}
