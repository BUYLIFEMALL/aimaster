import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMemberAccount, saveMemberAccount } from "@/lib/memberIntegrations";

// 회원 연동 정보 공용 저장 ②단계 시범(v1.21, 2026-10-20 — 루트 docs/MEMBER_INTEGRATIONS.md).
// Threads 계정은 공용 표(member_platform_accounts)를 먼저 보고, 없으면 이 프로그램 표(threads_accounts)를 본다.
// 두 곳 모두 회원 본인이 연결한 값이라 최상위 규칙(본인 계정만)에 맞다. 다른 Threads 프로그램에서 연결해도 여기서 그대로 쓴다.

export const PROGRAM_SLUG = "auto-threads-posting";
// 이 프로그램이 OAuth에서 요청하는 권한(lib/threads/client.ts THREADS_SCOPES와 같음) — 게시에 필요한 최소 권한
export const THREADS_PUBLISH_SCOPES = ["threads_basic", "threads_content_publish"];

export type ThreadsAccountForUser = {
  threads_user_id: string;
  username: string | null;
  access_token: string;
  token_expires_at: string | null;
  /** shared = 공용 연결 계정, program = 이 프로그램 표 */
  source: "shared" | "program";
  connected_via: string | null;
};

export async function getThreadsAccountForUser(userId: string): Promise<ThreadsAccountForUser | null> {
  const admin = createAdminClient();
  const shared = await getMemberAccount(admin, userId, "threads", { needScopes: THREADS_PUBLISH_SCOPES });
  if (shared.status === "ok" && !shared.account.needsReconnect) {
    return {
      threads_user_id: shared.account.externalId,
      username: shared.account.username,
      access_token: shared.account.accessToken,
      token_expires_at: shared.account.tokenExpiresAt,
      source: "shared",
      connected_via: shared.account.connectedVia,
    };
  }

  const { data } = await admin
    .from("threads_accounts")
    .select("threads_user_id, username, access_token, token_expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  return data ? { ...data, source: "program", connected_via: PROGRAM_SLUG } : null;
}

/** 연결 콜백에서 공용 표에도 저장(이중 기록). 실패해도 이 프로그램 연결은 그대로 둔다 — 기록만 남김 */
export async function saveSharedThreadsAccount(input: {
  userId: string;
  threadsUserId: string;
  username: string | null;
  accessToken: string;
  tokenExpiresAt: string;
  appId: string;
}) {
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
  if (error) console.error("[threads] 공용 연결 계정 저장 실패", error);
}

/** 연결 해제 — 공용 표의 Threads 계정도 지운다(남겨 두면 해제해도 계속 연결된 상태로 보임) */
export async function deleteSharedThreadsAccount(userId: string) {
  await createAdminClient().from("member_platform_accounts").delete().eq("user_id", userId).eq("platform", "threads");
}
