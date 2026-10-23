// 회원 예약 실행 방식 — 이 프로그램만의 값(2026-10-20). 공용 기준 코드 `memberScheduler.ts`(기준 cardnews-studio, 사본 직접 수정 금지)가 읽는다.
// 이 파일은 공용 사본이 아니다 — 프로그램마다 다르게 둔다. 지침: 루트 docs/SCHEDULER_POLICY.md · 등록: docs/SHARED_MODULES.md 「member-scheduler」
import type { SupabaseClient } from "@supabase/supabase-js";

/** 회원 cron-job.org가 부를 이 사이트 주소(공식 주소 = programs.app_url) */
export const SCHEDULER_SITE_ORIGIN = "https://booking-reminder.buylife.xyz";
/** 회원 실행 방식 표 */
export const SCHEDULER_TABLE = "booking_member_scheduler";
/** 회원 전용 토큰 앞글자(「booking_」 + 64자리) */
export const SCHEDULER_TOKEN_PREFIX = "booking";
/** 관리자가 Vercel 방식을 끌 때 쓰는 환경변수 이름(운영: off면 꺼짐 / 설치 키트: on일 때만 켜짐) */
export const PLATFORM_SCHEDULER_ENV = "BOOKING_PLATFORM_SCHEDULER";
/** 설치 키트(배포판) 모드 — 이 프로그램은 운영 전용 */
export const SCHEDULER_IS_STANDALONE = false;
/** 회원 cron-job.org가 부르는 실행 주소 */
export { MEMBER_DISPATCH_PATH } from "./cronJobOrg";

/** 「남은 일」 = 켜진 리마인드 규칙 수(0이면 회원 cron-job.org 작업을 끈다) */
export async function countRemainingWork(service: SupabaseClient, userId: string): Promise<number> {
  const { count } = await service.from("booking_reminder_rules").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("is_active", true);
  return count ?? 0;
}
