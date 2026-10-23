import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMemberAccount, saveMemberAccount } from "@/lib/memberIntegrations";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

// 회원 연동 정보 공용 저장 ④단계(v1.21, 2026-10-20 — 루트 docs/MEMBER_INTEGRATIONS.md).
// 게시 권한까지 받은 Facebook 로그인 방식 공용 Instagram 계정이 있으면 그것을 쓰고, 없으면 이 프로그램 표(instagram_accounts)를 쓴다.
// 이 프로그램은 graph.facebook.com으로 게시하므로 Instagram 로그인 토큰(graph.instagram.com)은 쓸 수 없다. 둘 다 회원 본인 값이다.

export const PROGRAM_SLUG = "auto-shorts-posting";
// lib/instagram/client.ts INSTAGRAM_SCOPES와 같은 목록
const REQUESTED_SCOPES = ["instagram_basic", "instagram_content_publish", "pages_show_list", "pages_read_engagement", "business_management"];
const PUBLISH_SCOPES = ["instagram_basic", "instagram_content_publish"];

export type ShotsInstagramAccount = {
  ig_user_id: string;
  ig_username: string | null;
  access_token: string;
  /** 공용 계정이면 member_platform_accounts.id, 이 프로그램 표면 null */
  shared_id: string | null;
};

export async function getShotsInstagramAccount(supabase: SupabaseClient<Database>, userId: string): Promise<ShotsInstagramAccount | null> {
  const shared = await getMemberAccount(createAdminClient(), userId, "instagram", {
    needScopes: PUBLISH_SCOPES,
    authMethod: "facebook_login",
  });
  if (shared.status === "ok" && !shared.account.needsReconnect) {
    return {
      ig_user_id: shared.account.externalId,
      ig_username: shared.account.username,
      access_token: shared.account.accessToken,
      shared_id: shared.account.id,
    };
  }

  const { data } = await supabase
    .from("instagram_accounts")
    .select("ig_user_id, ig_username, access_token")
    .eq("user_id", userId)
    .maybeSingle();
  return data ? { ...data, shared_id: null } : null;
}

/** 연결 콜백에서 공용 표에도 저장(이중 기록). 실패해도 이 프로그램 연결은 그대로 — 기록만 남김 */
export async function saveSharedShotsInstagramAccount(input: {
  userId: string;
  igUserId: string;
  username: string | null;
  pageId: string | null;
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
    grantedScopes: REQUESTED_SCOPES,
    authMethod: "facebook_login",
    appRef: input.appId,
    extra: input.pageId ? { page_id: input.pageId } : {},
    connectedVia: PROGRAM_SLUG,
  });
  if (error) console.error("[shots] 공용 연결 계정 저장 실패", error);
}

/** 연결 해제 — 공용 표의 Instagram 계정도 지운다(남겨 두면 해제해도 계속 연결된 상태로 보임) */
export async function deleteSharedInstagramAccount(userId: string) {
  await createAdminClient().from("member_platform_accounts").delete().eq("user_id", userId).eq("platform", "instagram");
}
