import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { PROGRAM_SLUG } from "@/lib/version";

// v1.22 사용 기록(usage_logs) — 보류 F(Shots ↔ 원스톱 합치기) 재판단용 회원 사용 추이. 실패해도 본 기능은 계속한다.
// 메타데이터에는 대본 내용 같은 생성물은 넣지 않고 ID·숫자만 남긴다.
export const USAGE_ACTIONS = ["script_created", "mp4_made", "youtube_uploaded"] as const;
export type UsageAction = (typeof USAGE_ACTIONS)[number];

let programId: string | null = null;
export async function recordUsage(userId: string, action: UsageAction, metadata?: Record<string, string | number | boolean | null>): Promise<void> {
  try {
    const admin = createAdminClient();
    if (!programId) {
      const { data } = await admin.from("programs").select("id").eq("slug", PROGRAM_SLUG).single();
      programId = (data as { id: string } | null)?.id ?? null;
    }
    if (!programId) return;
    await admin.from("usage_logs").insert({ user_id: userId, program_id: programId, action, quantity: 1, credits_used: 0, metadata: metadata ?? null });
  } catch (e) {
    console.error("[shorts-onestop-studio] usage_logs 기록 실패", e);
  }
}
