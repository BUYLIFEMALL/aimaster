import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./env";

// 운영 모드(T0)에서 프로그램 이용 권한 판정(profiles·programs·subscriptions·user_program_access)만 읽는다 — 핵심 원칙 6(RLS 차단 방지).
// 몰 데이터는 여기로 읽지 않는다(몰 데이터는 언제나 로그인한 사람 권한 + 보안 규칙).
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!SUPABASE_URL || !key) throw new Error("서버 키(SUPABASE_SECRET_KEY)가 설정되지 않았습니다.");
  return createSupabaseClient(SUPABASE_URL, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
