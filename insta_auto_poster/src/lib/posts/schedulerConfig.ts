// 회원 예약 실행 방식 — 이 프로그램만의 값(2026-10-20). 공용 기준 코드 `memberScheduler.ts`(기준 cardnews-studio, 사본 직접 수정 금지)가 읽는다.
// 이 파일은 공용 사본이 아니다 — 프로그램마다 다르게 둔다. 지침: 루트 docs/SCHEDULER_POLICY.md · 등록: docs/SHARED_MODULES.md 「member-scheduler」
import type { SupabaseClient } from "@supabase/supabase-js";
import { IS_STANDALONE as IS_STANDALONE_LOCAL } from "@/lib/deployment";

/** 회원 cron-job.org가 부를 이 사이트 주소(공식 주소 = programs.app_url) */
export { SITE_ORIGIN as SCHEDULER_SITE_ORIGIN } from "@/lib/oauthRedirect";
/** 회원 실행 방식 표 */
export const SCHEDULER_TABLE = "insta_member_scheduler";
/** 회원 전용 토큰 앞글자(「ins_」 + 64자리) */
export const SCHEDULER_TOKEN_PREFIX = "ins";
/** 관리자가 Vercel 방식을 끌 때 쓰는 환경변수 이름(운영: off면 꺼짐 / 설치 키트: on일 때만 켜짐) */
export const PLATFORM_SCHEDULER_ENV = "INSTA_PLATFORM_SCHEDULER";
export { IS_STANDALONE as SCHEDULER_IS_STANDALONE } from "@/lib/deployment";
/** 회원 cron-job.org가 부르는 실행 주소 */
export { MEMBER_DISPATCH_PATH } from "./cronJobOrg";

/** 「남은 일」 = 예약 글 수(0이면 회원 cron-job.org 작업을 끈다). v1.39: 카드뉴스 스튜디오 예약(`cns_insta_posts`)도 같은 설정으로 실행하므로 함께 센다(배포판에는 카드뉴스 표가 없음) */
export async function countRemainingWork(service: SupabaseClient, userId: string): Promise<number> {
  const { count } = await service.from("insta_posts").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "scheduled");
  if (IS_STANDALONE_LOCAL) return count ?? 0;
  const { count: cardnews } = await service.from("cns_insta_posts").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "scheduled");
  return (count ?? 0) + (cardnews ?? 0);
}
