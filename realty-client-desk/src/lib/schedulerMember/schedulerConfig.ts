// 회원 예약 실행 방식 — 이 프로그램만의 값(2026-11-03, v1.04). 공용 기준 코드 `memberScheduler.ts`(사본 직접 수정 금지)가 읽는다.
// 이 파일은 공용 사본이 아니다. 지침: 루트 docs/SCHEDULER_POLICY.md · 등록: docs/SHARED_MODULES.md 「member-scheduler」
import type { SupabaseClient } from "@supabase/supabase-js";

/** 회원 cron-job.org가 부를 이 사이트 주소(공식 주소 = programs.app_url) */
export const SCHEDULER_SITE_ORIGIN = "https://realty-client-desk.buylife.xyz";
/** 회원 실행 방식 표 */
export const SCHEDULER_TABLE = "realty_desk_member_scheduler";
/** 회원 전용 토큰 앞글자(「deskcal_」 + 64자리) */
export const SCHEDULER_TOKEN_PREFIX = "deskcal";
/** Vercel 방식을 켜는 환경변수 이름(on일 때만 — 지금은 설정하지 않음) */
export const PLATFORM_SCHEDULER_ENV = "REALTY_DESK_PLATFORM_SCHEDULER";
/** 2026-11-03 주인님 「일반 사용자들은 vercel을 사용하지 않으니 기본값은 cron-job 가입 후 등록」 — 이 프로그램은 운영자 Vercel 예약 호출을 회원 일정 알림에 쓰지 않는다
 * (메인 지침 원칙 26: 운영자 호출은 관리자가 지정한 프로그램만). 공용 사본을 고치지 않고 「키트 모드」 스위치를 켜서 기본 = 내 cron-job.org, Vercel 방식 = 환경변수
 * REALTY_DESK_PLATFORM_SCHEDULER=on일 때만(설정하지 않음). 운영 아침 호출(/api/cron/daily)은 1년 보관 정리만 한다. */
export const SCHEDULER_IS_STANDALONE = true;
/** 회원 cron-job.org가 부르는 실행 주소 */
export { MEMBER_DISPATCH_PATH } from "./cronJobOrg";

/** 「남은 일」 = 아직 알리지 않은 앞으로의 일정 수(0이면 회원 cron-job.org 작업을 끈다) */
export async function countRemainingWork(service: SupabaseClient, userId: string): Promise<number> {
  const { count } = await service.from("realty_desk_events").select("id", { count: "exact", head: true })
    .eq("user_id", userId).eq("done", false).is("notified_at", null).gte("event_at", new Date().toISOString());
  return count ?? 0;
}
