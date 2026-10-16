import "server-only";
import { createClient } from "@supabase/supabase-js";

// 권한 판정용 서비스 롤 클라이언트(CLAUDE.md 핵심 원칙 6: 권한 테이블 조회는 RLS 영향을 받지 않게 createAdminClient로).
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, (process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim())!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
