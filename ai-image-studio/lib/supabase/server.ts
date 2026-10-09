import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://esgxyikcnnvmlhygjkth.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_dpa8WnGOUodpmS7_eNy91g_G-smJrml";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignored when called in Server Components
          }
        },
      },
    }
  );
}

export function createAdminClient() {
  // 서비스(비밀) 키는 반드시 환경변수로만 받는다. 코드·문서에 기본값을 넣지 않는다(2026-10-09 키 노출 사고: docs/ERROR_LESSONS.md).
  // NEXT_PUBLIC_ 접두사 변수는 브라우저에 실리므로 서비스 키에 쓰지 않는다.
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다.");
  return createSupabaseClient(SUPABASE_URL, serviceRoleKey);
}
