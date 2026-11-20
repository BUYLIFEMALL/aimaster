// R1 이 앱(AI 인플루언서) 연결점 — **후보**(2026-11-20, CC-SNS-01). 제품 코드가 아니다.
// ★ 이 파일은 문서 폴더에 있고 어느 프로그램의 빌드·npm test에도 들어가지 않는다. 운영 DB 적용(R1 후보 SQL)과 공용 기준 3파일 반영이 끝난 뒤,
//   이 내용을 ai-influencer-studio/src/lib/instagram/schedulerConfig.ts 끝에 옮긴다(그때는 `export const platformSchedulerPolicy = createPlatformSchedulerPolicy();` 한 줄을 더한다).
// 계약: ai-influencer-studio/docs/PLAN_20261119_R1_SCHEDULER_DEFAULT.md §13·§14(559행) — 공용 `memberScheduler.ts`가 `platformSchedulerPolicy` 하나만 읽는다.
//   * 기본값은 「내 cron-job.org」. 사이트(Vercel) 예약은 관리자 허용 + 회원의 명시 선택이 둘 다 있을 때만 유효하다(선택·판 번호는 공용 코드가 칸 이름으로 다룬다).
//   * allowed            = 그 회원이 관리자(profiles.is_admin)이거나 허용 저장소에 허용 중(aif_platform_scheduler_is_allowed)
//   * listAllowedUserIds = 허용 저장소의 허용 회원(aif_platform_scheduler_allowed_users) + 관리자 전원. 사이트 예약 실행(Vercel)의 대상 범위다.
//   * 조회가 실패하면 **던진다**(거짓·빈 목록으로 답하지 않는다). 공용 코드가 실패를 「쓸 수 없음」으로 처리한다 — 모르는 것을 허용으로 읽지 않는다.
// 권한: 두 함수는 service_role만 실행할 수 있다(R1 후보 SQL). 여기 넘어오는 클라이언트는 앱 서버의 서비스 역할 클라이언트다.
import type { SupabaseClient } from "@supabase/supabase-js";

/** 한 번에 받는 행 수의 상한. PostgREST 기본 상한(1000)에 걸려 목록이 잘리면 일부 회원이 조용히 빠진다 — 그 경우를 「알 수 없음」으로 던진다. */
export const POLICY_LIST_LIMIT = 1000;

const fail = (what: string, message?: string): never => {
  throw new Error(`사이트 예약 허용 확인 실패(${what})${message ? `: ${message}` : ""}`);
};

/** 허용 여부 — 관리자이거나 허용 저장소에 허용 중 */
async function allowed(service: SupabaseClient, userId: string): Promise<boolean> {
  if (!userId) return false;
  const profile = await service.from("profiles").select("is_admin").eq("id", userId).maybeSingle();
  if (profile.error) fail("관리자 확인", profile.error.message);
  if (profile.data?.is_admin === true) return true;
  const res = await service.rpc("aif_platform_scheduler_is_allowed", { p_user: userId });
  if (res.error) fail("허용 조회", res.error.message);
  if (typeof res.data !== "boolean") fail("허용 조회", "응답 모양이 다릅니다");
  return res.data === true;
}

/** 사이트 예약 실행의 대상 범위 — 허용 회원 + 관리자(중복 없이) */
async function listAllowedUserIds(service: SupabaseClient): Promise<string[]> {
  const listed = await service.rpc("aif_platform_scheduler_allowed_users");
  if (listed.error) fail("허용 목록", listed.error.message);
  if (!Array.isArray(listed.data)) fail("허용 목록", "응답 모양이 다릅니다");
  const admins = await service.from("profiles").select("id").eq("is_admin", true).limit(POLICY_LIST_LIMIT);
  if (admins.error) fail("관리자 목록", admins.error.message);
  if (!Array.isArray(admins.data)) fail("관리자 목록", "응답 모양이 다릅니다");
  const fromList = listed.data as unknown[];
  const fromAdmins = (admins.data as { id?: unknown }[]).map((r) => r?.id);
  // 상한에 닿았으면 잘렸을 수 있다 — 일부만 실행하지 않고 멈춘다
  if (fromList.length >= POLICY_LIST_LIMIT || fromAdmins.length >= POLICY_LIST_LIMIT) fail("목록 상한", `한 번에 ${POLICY_LIST_LIMIT}명 이상은 다루지 않습니다`);
  const ids = new Set<string>();
  for (const v of [...fromList, ...fromAdmins]) {
    if (typeof v !== "string" || !v) fail("목록 값", "회원 번호가 아닌 값이 섞여 있습니다");
    ids.add(v as string);
  }
  return [...ids];
}

/** 공용 `memberScheduler.ts`가 읽는 연결점 객체를 만든다 */
export function createPlatformSchedulerPolicy() {
  return {
    defaultMode: "cronjob" as const,
    /** 회원이 사이트(Vercel) 예약을 직접 고른 시각 칸 */
    choiceColumn: "platform_chosen_at",
    /** 판 번호 칸(읽은 번호와 같을 때만 갱신) */
    revisionColumn: "mode_rev",
    allowed,
    listAllowedUserIds,
  };
}
