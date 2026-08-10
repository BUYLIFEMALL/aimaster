import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

// service role key를 사용하는 관리자 클라이언트. RLS를 우회하므로
// 반드시 서버 코드(Server Action, Route Handler)에서만 사용하세요.
// "server-only" import로 클라이언트 번들에 포함될 경우 빌드 타임에 에러가 발생합니다.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase service role 환경변수가 설정되지 않았습니다.");
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
