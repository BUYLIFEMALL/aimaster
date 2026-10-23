import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMemberAccount, saveMemberAccount } from "@/lib/memberIntegrations";
import { IS_STANDALONE } from "@/lib/deployment";
import type { InstagramAuthMethod } from "@/types/database.types";

// 회원 연동 정보 공용 저장 ④단계(v1.30, 2026-10-20 — 루트 docs/MEMBER_INTEGRATIONS.md).
// 게시 권한까지 받은 공용 Instagram 계정이 있으면 그것을 쓰고, 없으면 이 프로그램 표(insta_accounts)를 쓴다. 둘 다 회원 본인 값이다.
// Facebook 로그인 토큰(graph.facebook.com)과 Instagram 로그인 토큰(graph.instagram.com)은 서로 바꿔 쓸 수 없어서
// 공용 계정의 로그인 방식에 맞는 권한이 있는지 함께 확인한다.
// 배포판(IS_STANDALONE)은 수강생 DB에 공용 표가 없으므로 공용 표를 건드리지 않는다.

export const PROGRAM_SLUG = "auto-instagram-posting";
// lib/instagram/client.ts의 요청 권한과 같은 목록(게시에 꼭 필요한 것만 확인)
export const PUBLISH_SCOPES: Record<string, string[]> = {
  instagram_login: ["instagram_business_basic", "instagram_business_content_publish"],
  facebook_login: ["instagram_basic", "instagram_content_publish"],
};
const REQUESTED_SCOPES: Record<string, string[]> = {
  instagram_login: ["instagram_business_basic", "instagram_business_content_publish"],
  facebook_login: ["instagram_basic", "instagram_content_publish", "pages_show_list", "pages_read_engagement", "business_management"],
};

export type PublishAccount = {
  ig_user_id: string;
  ig_username: string | null;
  page_id: string | null;
  access_token: string;
  token_expires_at: string | null;
  auth_method: InstagramAuthMethod;
  /** 공용 계정이면 member_platform_accounts.id, 이 프로그램 표면 null */
  shared_id: string | null;
  connected_via: string | null;
};

type Db = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

/** 게시에 쓸 계정. 공용 계정(게시 권한·재연결 필요 아님) → 없으면 insta_accounts */
export async function getInstaAccountForUser(db: Db, userId: string): Promise<PublishAccount | null> {
  if (!IS_STANDALONE) {
    const shared = await getMemberAccount(createAdminClient(), userId, "instagram");
    if (shared.status !== "not_connected") {
      const a = shared.account;
      const need = a.authMethod ? PUBLISH_SCOPES[a.authMethod] : undefined;
      const pageId = typeof a.extra.page_id === "string" ? a.extra.page_id : null;
      const usable =
        need &&
        !a.needsReconnect &&
        need.every((s) => a.grantedScopes.includes(s)) &&
        (a.authMethod !== "facebook_login" || pageId);
      if (usable) {
        return {
          ig_user_id: a.externalId,
          ig_username: a.username,
          page_id: pageId,
          access_token: a.accessToken,
          token_expires_at: a.tokenExpiresAt,
          auth_method: a.authMethod as InstagramAuthMethod,
          shared_id: a.id,
          connected_via: a.connectedVia,
        };
      }
    }
  }

  const { data } = await db
    .from("insta_accounts")
    .select("ig_user_id, ig_username, page_id, access_token, token_expires_at, auth_method")
    .eq("user_id", userId)
    .maybeSingle();
  return data ? { ...data, shared_id: null, connected_via: PROGRAM_SLUG } : null;
}

/** 연결 저장 때 공용 표에도 저장(이중 기록). 실패해도 이 프로그램 연결은 그대로 — 기록만 남김 */
export async function saveSharedInstagramAccount(input: {
  userId: string;
  igUserId: string;
  username: string | null;
  pageId: string | null;
  authMethod: "instagram_login" | "facebook_login";
  accessToken: string;
  tokenExpiresAt: string;
  appId: string | null;
}) {
  if (IS_STANDALONE) return;
  const { error } = await saveMemberAccount(createAdminClient(), {
    userId: input.userId,
    platform: "instagram",
    externalId: input.igUserId,
    username: input.username,
    accessToken: input.accessToken,
    tokenExpiresAt: input.tokenExpiresAt,
    grantedScopes: REQUESTED_SCOPES[input.authMethod],
    authMethod: input.authMethod,
    appRef: input.appId,
    extra: input.pageId ? { page_id: input.pageId } : {},
    connectedVia: PROGRAM_SLUG,
  });
  if (error) console.error("[insta_auto_poster] 공용 연결 계정 저장 실패", error);
}

/** 연결 해제 — 공용 표의 Instagram 계정도 지운다(남겨 두면 해제해도 계속 연결된 상태로 보임) */
export async function deleteSharedInstagramAccount(userId: string) {
  if (IS_STANDALONE) return;
  await createAdminClient().from("member_platform_accounts").delete().eq("user_id", userId).eq("platform", "instagram");
}
