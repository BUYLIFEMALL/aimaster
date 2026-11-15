"use server";

import { requireProgramAccess } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { TOKENS } from "@/lib/extension/token";
import { presenceOf, type Presence } from "@/lib/extension/presence";

// 확장 연결 표는 회원 정책이 없는 서버 전용 표라 관리자 클라이언트로 읽되, 반드시 본인 user_id 행만 본다.
export async function getExtensionPresenceAction(): Promise<{ state: Presence; lastSeen: string | null }> {
  const user = await requireProgramAccess();
  const { data } = await createAdminClient().from(TOKENS).select("last_seen_at").eq("user_id", user.id).not("token_hash", "is", null);
  return presenceOf(((data ?? []) as { last_seen_at: string | null }[]).map((r) => r.last_seen_at));
}
