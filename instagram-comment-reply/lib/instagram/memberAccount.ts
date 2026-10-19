import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMemberAccount, saveMemberAccount } from "@/lib/memberIntegrations";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

// 회원 연동 정보 공용 저장 ④단계(v1.17, 2026-10-20 — 루트 docs/MEMBER_INTEGRATIONS.md).
// 댓글 권한(instagram_business_manage_comments)까지 받은 Instagram 로그인 방식 공용 계정이 있으면 그것을 쓰고,
// 없으면(게시 권한만 있거나 Facebook 로그인으로 연결한 공용 계정 포함) 이 프로그램 표(ig_accounts)를 쓴다. 둘 다 회원 본인 값이다.
// 이 프로그램은 graph.instagram.com만 부르므로 Facebook 로그인 토큰은 쓸 수 없다.

export const PROGRAM_SLUG = "instagram-comment-reply";
// lib/instagram/client.ts INSTAGRAM_SCOPES와 같은 목록
export const INSTAGRAM_COMMENT_SCOPES = ["instagram_business_basic", "instagram_business_manage_comments"];

export type CommentAccount = {
  access_token: string;
  token_expires_at: string | null;
  ig_user_id: string;
  username: string;
  needs_reconnect: boolean;
  /** 공용 계정이면 member_platform_accounts.id, 이 프로그램 표면 null */
  shared_id: string | null;
  connected_via: string | null;
};

export async function getCommentAccount(supabase: SupabaseClient<Database>, userId: string): Promise<CommentAccount | null> {
  const shared = await getMemberAccount(createAdminClient(), userId, "instagram", {
    needScopes: INSTAGRAM_COMMENT_SCOPES,
    authMethod: "instagram_login",
  });
  // 계정 이름이 있어야 「내 답글에 다시 답하는 무한 반복」을 걸러낼 수 있으므로(lib/comments/sync.ts) 이름이 없으면 공용 계정을 쓰지 않는다
  if (shared.status === "ok" && !shared.account.needsReconnect && shared.account.username) {
    return {
      access_token: shared.account.accessToken,
      token_expires_at: shared.account.tokenExpiresAt,
      ig_user_id: shared.account.externalId,
      username: shared.account.username,
      needs_reconnect: false,
      shared_id: shared.account.id,
      connected_via: shared.account.connectedVia,
    };
  }

  const { data } = await supabase
    .from("ig_accounts")
    .select("access_token, token_expires_at, ig_user_id, username, needs_reconnect")
    .eq("user_id", userId)
    .maybeSingle();
  return data ? { ...data, shared_id: null, connected_via: PROGRAM_SLUG } : null;
}

/** 연결 콜백에서 공용 표에도 저장(이중 기록). 실패해도 이 프로그램 연결은 그대로 — 기록만 남김 */
export async function saveSharedCommentAccount(input: {
  userId: string;
  igUserId: string;
  username: string | null;
  accessToken: string;
  tokenExpiresAt: string;
  appId: string;
}) {
  const { error } = await saveMemberAccount(createAdminClient(), {
    userId: input.userId,
    platform: "instagram",
    externalId: input.igUserId,
    username: input.username,
    accessToken: input.accessToken,
    tokenExpiresAt: input.tokenExpiresAt,
    grantedScopes: INSTAGRAM_COMMENT_SCOPES,
    authMethod: "instagram_login",
    appRef: input.appId,
    connectedVia: PROGRAM_SLUG,
  });
  if (error) console.error("[instagram-comment-reply] 공용 연결 계정 저장 실패", error);
}

/** 연결 해제 — 공용 표의 Instagram 계정도 지운다(남겨 두면 해제해도 계속 연결된 상태로 보임) */
export async function deleteSharedInstagramAccount(userId: string) {
  await createAdminClient().from("member_platform_accounts").delete().eq("user_id", userId).eq("platform", "instagram");
}
