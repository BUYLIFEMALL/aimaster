// 인스타 예약 게시 — 이 프로그램만의 값(2026-10-20). 공용 기준 코드 `memberScheduler.ts`·`cronJobOrg.ts`(카드뉴스 기준 사본, 직접 고치지 않음)가 읽는다.
// 이 파일은 공용 사본이 아니다 — 프로그램마다 다르게 둔다. 지침: 루트 docs/SCHEDULER_POLICY.md · 등록: docs/SHARED_MODULES.md 「insta-member-scheduler」
/** 회원 cron-job.org가 부를 이 사이트 주소(공식 주소 = programs.app_url) */
export const SCHEDULER_SITE_ORIGIN = "https://auto-instagram-posting.buylife.xyz"; // 2026-10-20 INSTA로 병합(옛 cardnews 주소의 기존 작업은 옛 앱이 계속 처리)
/** 회원 실행 방식 표 */
export const SCHEDULER_TABLE = "cns_member_scheduler";
/** 게시 기록·예약 표(남은 예약 세기) */
export const SCHEDULER_POSTS_TABLE = "cns_insta_posts";
/** 회원 전용 토큰 앞글자(「cns_」 + 64자리) */
export const SCHEDULER_TOKEN_PREFIX = "cns";
/** 관리자가 Vercel 방식을 끌 때 쓰는 환경변수 이름(값이 off면 꺼짐, 없으면 켜짐) */
export const PLATFORM_SCHEDULER_ENV = "CNS_PLATFORM_SCHEDULER";
/** 회원 cron-job.org가 1분마다 부르는 실행 주소 */
export const MEMBER_DISPATCH_PATH = "/api/cardnews/instagram/dispatch-member";
/** 회원 cron-job.org에 만드는 작업 이름 */
export const CRON_JOB_TITLE = "AIMaster INSTA 카드뉴스 예약 게시(1분)";

// 공용 member-scheduler(2026-10-20 15개로 확대)가 읽는 값
import type { SupabaseClient } from "@supabase/supabase-js";
/** 설치 키트(배포판) 모드 — 이 프로그램은 운영 전용 */
export const SCHEDULER_IS_STANDALONE = false;
/** 「남은 일」 = 남은 예약 게시 수(0이면 회원 cron-job.org 작업을 끈다) */
export async function countRemainingWork(service: SupabaseClient, userId: string): Promise<number> {
  const { count } = await service.from(SCHEDULER_POSTS_TABLE).select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "scheduled");
  return count ?? 0;
}
