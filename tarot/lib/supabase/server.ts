import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// 로그인한 사용자의 세션 쿠키를 사용하는 서버 전용 클라이언트.
// RLS가 적용되므로 항상 auth.uid()에 해당하는 사용자의 데이터만 접근할 수 있습니다.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
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
            // 세션 갱신은 middleware.ts에서 처리합니다.
          }
        },
      },
    },
  );
}

// Service Role Key를 사용해 RLS를 우회하는 어드민/공개 복원용 서버 클라이언트
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createSupabaseClient(supabaseUrl, serviceRoleKey);
}
