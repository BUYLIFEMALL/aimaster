import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database.types";

// 로그인한 사용자의 세션 쿠키를 사용하는 서버 전용 클라이언트.
// RLS가 적용되므로 항상 auth.uid()에 해당하는 사용자의 데이터만 접근할 수 있습니다.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component에서 호출된 경우 setAll은 무시해도 됩니다.
            // 세션 갱신은 proxy.ts에서 처리합니다.
          }
        },
      },
    },
  );
}
