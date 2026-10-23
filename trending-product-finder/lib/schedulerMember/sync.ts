import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureMemberSchedulerRunning, memberCronjobKey, memberSchedulerMode, platformSchedulerEnabled, stopMemberSchedulerIfIdle } from "@/lib/schedulerMember/memberScheduler";

/**
 * 관심 목록·관심 상품 알림을 켜거나(만들기 포함) 끄거나 지운 뒤 회원 cron-job.org 작업을 맞춘다(v1.15). 지침: 루트 docs/SCHEDULER_POLICY.md
 * 켤 때 준비가 안 됐으면 안내 문구를 돌려준다(되돌릴지는 부르는 쪽이 정한다 — 켜기 스위치는 되돌리고, 새로 만든 것은 그대로 둔다).
 * 끌 때는 켜진 정기 작업이 0개면 작업을 끈다(실패해도 무시 — 다음 회원 실행 때 다시 확인).
 */
export async function syncMemberScheduler(userId: string, enabledNow: boolean): Promise<string | null> {
  const service = createAdminClient() as unknown as SupabaseClient;
  const mode = await memberSchedulerMode(service, userId);
  if (!enabledNow) {
    if (mode === "cronjob") await stopMemberSchedulerIfIdle(service, userId).catch(() => false);
    return null;
  }
  if (mode === "cronjob") {
    const key = await memberCronjobKey(service, userId);
    if (!key) return "「내 cron-job.org」 방식은 API 키가 필요합니다. 설정 → ⏰ 예약 발행에서 키를 등록하거나 AIMaster 기본(Vercel) 방식을 선택해 주세요.";
    try {
      await ensureMemberSchedulerRunning(service, userId, key);
    } catch (err) {
      return `리포트·알림 작업을 켜지 못했습니다. ${err instanceof Error ? err.message : ""}`.trim();
    }
    return null;
  }
  if (!platformSchedulerEnabled()) return "이 사이트는 Vercel 예약 호출이 꺼져 있습니다. 설정 → ⏰ 예약 발행에서 「내 cron-job.org」를 선택하고 키를 등록해 주세요.";
  return null;
}
