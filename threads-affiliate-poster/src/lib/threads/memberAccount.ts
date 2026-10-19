import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMemberAccount, saveMemberAccount, updateMemberAccountToken } from "@/lib/memberIntegrations";
import { IS_STANDALONE } from "@/lib/deployment";

// 회원 연동 정보 공용 저장 ③단계(v1.66, 2026-10-20 — 루트 docs/MEMBER_INTEGRATIONS.md).
// Threads 계정은 공용 표(member_platform_accounts, 게시 권한)를 먼저 보고, 없으면 이 프로그램 표(tap_accounts)를 본다. 둘 다 회원 본인 값이다.
// 배포판(IS_STANDALONE)은 공용 표가 없는 수강생 본인 DB라 이 프로그램 표만 쓴다.
// 키워드 검색(threads_keyword_search, 연결 때 선택 권한)은 다른 프로그램 토큰에 없을 수 있어 actions/viral.ts가 tap_accounts만 계속 쓴다.

export const PROGRAM_SLUG = "threads-affiliate-poster";
// lib/threads/client.ts THREADS_SCOPES와 같음(게시에 필요한 최소 권한)
export const THREADS_PUBLISH_SCOPES = ["threads_basic", "threads_content_publish"];

export type AffiliateThreadsAccount = {
  /** tap_accounts.id — 공용 계정이면 null */
  id: string | null;
  threads_user_id: string;
  username: string | null;
  access_token: string;
  token_expires_at: string | null;
  updated_at: string | null;
  source: "shared" | "program";
  /** 공용 계정이면 member_platform_accounts.id */
  shared_id: string | null;
  connected_via: string | null;
};

export async function getThreadsAccountForUser(userId: string): Promise<AffiliateThreadsAccount | null> {
  const admin = createAdminClient();
  if (!IS_STANDALONE) {
    const shared = await getMemberAccount(admin, userId, "threads", { needScopes: THREADS_PUBLISH_SCOPES });
    if (shared.status === "ok" && !shared.account.needsReconnect) {
      const { data: row } = await admin.from("member_platform_accounts" as never).select("updated_at").eq("id", shared.account.id).maybeSingle();
      return {
        id: null,
        threads_user_id: shared.account.externalId,
        username: shared.account.username,
        access_token: shared.account.accessToken,
        token_expires_at: shared.account.tokenExpiresAt,
        updated_at: (row as { updated_at?: string } | null)?.updated_at ?? null,
        source: "shared",
        shared_id: shared.account.id,
        connected_via: shared.account.connectedVia,
      };
    }
  }
  const { data } = await admin
    .from("tap_accounts")
    .select("id, threads_user_id, username, access_token, token_expires_at, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  return data ? { ...data, source: "program", shared_id: null, connected_via: PROGRAM_SLUG } : null;
}

/** 예약 발행 중 토큰 자동 연장 결과 저장 — 읽은 곳(공용 표 / 이 프로그램 표)에 기록 */
export async function saveRefreshedToken(userId: string, account: AffiliateThreadsAccount, accessToken: string) {
  const admin = createAdminClient();
  if (account.shared_id) {
    await updateMemberAccountToken(admin, userId, account.shared_id, { accessToken, tokenExpiresAt: account.token_expires_at });
    return;
  }
  if (account.id) {
    await admin.from("tap_accounts").update({ access_token: accessToken, updated_at: new Date().toISOString() }).eq("id", account.id);
  }
}

/** 연결 콜백에서 공용 표에도 저장(이중 기록). 배포판은 건너뜀. 실패해도 이 프로그램 연결은 그대로 — 기록만 남김 */
export async function saveSharedThreadsAccount(input: {
  userId: string;
  threadsUserId: string;
  username: string | null;
  accessToken: string;
  tokenExpiresAt: string;
  appId: string;
}) {
  if (IS_STANDALONE) return;
  const { error } = await saveMemberAccount(createAdminClient(), {
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
  if (error) console.error("[threads-affiliate-poster] 공용 연결 계정 저장 실패", error);
}

/** 연결 해제 — 공용 표의 Threads 계정도 지운다(배포판은 건너뜀) */
export async function deleteSharedThreadsAccount(userId: string) {
  if (IS_STANDALONE) return;
  await createAdminClient().from("member_platform_accounts" as never).delete().eq("user_id", userId).eq("platform", "threads");
}
