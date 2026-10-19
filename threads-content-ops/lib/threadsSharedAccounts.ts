import "server-only";
import { saveMemberAccount } from "@/threads-content-ops/lib/memberIntegrations";
import { IS_STANDALONE } from "@/threads-content-ops/lib/deployment";

// 회원 연동 정보 공용 저장 ③단계(v2.11, 2026-10-20 — 루트 docs/MEMBER_INTEGRATIONS.md).
// 이 프로그램은 Threads 계정을 여러 개 연결하고, 글·운영 설정·글감이 tco_threads_accounts.id를 가리킨다(on delete cascade).
// 그래서 공용 표를 직접 읽지 않고, 화면을 열 때 다른 Threads 프로그램에서 연결한 공용 계정을 이 프로그램 계정 목록으로 「가져온다」.
// 둘 다 회원 본인 값이다. 배포판(IS_STANDALONE)은 공용 표가 없는 수강생 DB라 아무것도 하지 않는다.

export const PROGRAM_SLUG = "threads-content-ops";
// 콜백(app/api/threads-content-ops/callback, web-actions.ts 인증 주소)에서 요청하는 권한과 같음
export const THREADS_PUBLISH_SCOPES = ["threads_basic", "threads_content_publish"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminDb = { from: (table: string) => any };

type SharedRow = { external_id: string; username: string | null; access_token: string; token_expires_at: string | null; granted_scopes: string[] | null };
type LocalRow = { id: string; threads_user_id: string; access_token: string; token_expires_at: string | null };

const usable = (expiresAt: string | null) => !expiresAt || new Date(expiresAt).getTime() > Date.now();

/**
 * 공용 Threads 계정(게시 권한·재연결 필요 아님·만료 전)을 이 프로그램 표로 가져온다.
 * - 이 프로그램에 없는 계정 → 새로 추가(다시 연결할 필요 없음)
 * - 이 프로그램 계정이 만료됐거나 토큰이 비었는데(Meta 콜백으로 무효화 등) 공용 계정은 살아 있으면 → 토큰만 바꿈
 * 실패해도 화면은 그대로 열린다(호출부에서 무시).
 */
export async function importSharedThreadsAccounts(admin: AdminDb, userId: string): Promise<number> {
  if (IS_STANDALONE) return 0;
  const { data: shared } = await admin
    .from("member_platform_accounts")
    .select("external_id, username, access_token, token_expires_at, granted_scopes")
    .eq("user_id", userId)
    .eq("platform", "threads")
    .eq("needs_reconnect", false);
  const candidates = ((shared ?? []) as SharedRow[]).filter(
    (s) => s.access_token && usable(s.token_expires_at) && THREADS_PUBLISH_SCOPES.every((p) => (s.granted_scopes ?? []).includes(p)),
  );
  if (candidates.length === 0) return 0;

  const { data: local } = await admin
    .from("tco_threads_accounts")
    .select("id, threads_user_id, access_token, token_expires_at")
    .eq("user_id", userId);
  const byThreadsId = new Map(((local ?? []) as LocalRow[]).map((a) => [a.threads_user_id, a]));

  let changed = 0;
  for (const s of candidates) {
    const mine = byThreadsId.get(s.external_id);
    if (!mine) {
      const { error } = await admin.from("tco_threads_accounts").insert({
        user_id: userId,
        threads_user_id: s.external_id,
        username: s.username,
        access_token: s.access_token,
        token_expires_at: s.token_expires_at,
      });
      if (!error) changed += 1;
    } else if (!mine.access_token || !usable(mine.token_expires_at)) {
      const { error } = await admin
        .from("tco_threads_accounts")
        .update({ access_token: s.access_token, token_expires_at: s.token_expires_at, updated_at: new Date().toISOString() })
        .eq("id", mine.id)
        .eq("user_id", userId);
      if (!error) changed += 1;
    }
  }
  return changed;
}

/** 연결 콜백에서 공용 표에도 저장(이중 기록). 배포판은 건너뜀. 실패해도 이 프로그램 연결은 그대로 — 기록만 남김 */
export async function saveSharedThreadsAccount(admin: AdminDb, input: {
  userId: string;
  threadsUserId: string;
  username: string | null;
  accessToken: string;
  tokenExpiresAt: string | null;
  appId: string;
}) {
  if (IS_STANDALONE) return;
  const { error } = await saveMemberAccount(admin, {
    userId: input.userId,
    platform: "threads",
    externalId: input.threadsUserId,
    username: input.username,
    accessToken: input.accessToken,
    tokenExpiresAt: input.tokenExpiresAt,
    grantedScopes: THREADS_PUBLISH_SCOPES,
    appRef: input.appId,
    connectedVia: PROGRAM_SLUG,
  });
  if (error) console.error("[threads-content-ops] 공용 연결 계정 저장 실패", error);
}

/** 계정 연결 해제 — 그 Threads 계정의 공용 행도 지운다(남겨 두면 화면을 다시 열 때 다시 가져와짐). 배포판은 건너뜀 */
export async function deleteSharedThreadsAccount(admin: AdminDb, userId: string, threadsUserId: string) {
  if (IS_STANDALONE) return;
  await admin.from("member_platform_accounts").delete().eq("user_id", userId).eq("platform", "threads").eq("external_id", threadsUserId);
}
