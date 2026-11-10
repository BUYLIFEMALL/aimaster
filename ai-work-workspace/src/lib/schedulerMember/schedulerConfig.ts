// 회원 정시 실행 — 이 프로그램만의 값(U11, 2026-11-10). 공용 기준 코드 `memberScheduler.ts`(사본, 직접 수정 금지)가 읽는다.
// 이 파일은 공용 사본이 아니다. 지침: 루트 docs/SCHEDULER_POLICY.md · 등록: docs/SHARED_MODULES.md 「member-scheduler」 · 플랜 docs/PLAN_20261110_U11_AUTOMATION.md
import type { SupabaseClient } from "@supabase/supabase-js";
import { countMemberJobs } from "@/server/memberJobs";

/** 회원 cron-job.org가 부를 이 사이트 주소(공식 주소 = programs.app_url) */
export const SCHEDULER_SITE_ORIGIN = "https://ai-work-workspace.buylife.xyz";
/** 회원 실행 방식 표(supabase/migrations/20261110000000_aww_member_scheduler.sql) */
export const SCHEDULER_TABLE = "aww_member_scheduler";
/** 회원 전용 토큰 앞글자(「aww_」 + 64자리) */
export const SCHEDULER_TOKEN_PREFIX = "aww";
/** 관리자 끄기 환경변수 이름(아래 STANDALONE=true라 「on」일 때만 운영자 방식이 켜짐 — 이 프로그램은 켜지 않는다) */
export const PLATFORM_SCHEDULER_ENV = "AWW_PLATFORM_SCHEDULER";
/**
 * 주인님 결정 1번(2026-11-10): 회원 정시 작업은 회원 본인 cron-job.org로만 돈다(운영자 하루 1번 cron은 운영 정리만).
 * 공용 코드는 이 값이 true일 때 기본 방식 = cron-job.org, 운영자(Vercel) 방식 = 꺼짐으로 동작하므로 그 동작을 쓰려고 true로 둔다
 * (설치 키트라는 뜻은 아님 — 공용 코드의 오류 문구 중 「설치 키트」 안내는 이 프로그램에서 나오지 않는다: 운영자 방식으로 바꾸는 화면이 없음).
 */
export const SCHEDULER_IS_STANDALONE = true;
/** 회원 cron-job.org가 부르는 실행 주소 */
export { MEMBER_DISPATCH_PATH } from "./cronJobOrg";

/** 「남은 일」 = 이 회원의 정시 작업 수(반복 자동화·반복 템플릿·리마인더). 0이면 회원 cron-job.org 작업을 끈다. */
export async function countRemainingWork(_service: SupabaseClient, userId: string): Promise<number> {
  return countMemberJobs(userId);
}
