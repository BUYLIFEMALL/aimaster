import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { InstagramAuthMethod } from "./publish";
import { getMemberAccount } from "@/lib/memberIntegrations";

// 회원 연동 정보 공용 저장·재사용 규칙(루트 CLAUDE.md 최상위 지침, 2026-10-19):
// 인스타그램 연결은 INSTA 포스팅 자동화에서 회원이 한 번 연결한 값(공용 DB `insta_accounts`, 회원별)을 그대로 가져다 쓴다.
// 로그인한 회원 본인 행만 읽고(user_id 조건), 토큰은 서버 안에서만 쓰며 화면으로 보내지 않는다.
// v1.18(2026-10-20, 루트 docs/MEMBER_INTEGRATIONS.md ④단계): 공용 연결 계정(member_platform_accounts)을 먼저 보고,
// 로그인 방식에 맞는 게시 권한이 있으면 그것을, 없으면 지금처럼 insta_accounts를 쓴다.

export const INSTA_CONNECT_URL = "https://auto-instagram-posting.buylife.xyz/settings";

export interface MemberInstagramAccount {
  igUserId: string;
  username: string;
  accessToken: string;
  authMethod: InstagramAuthMethod;
  expired: boolean;
}

// 로그인 방식별 게시에 꼭 필요한 권한(INSTA 포스팅 lib/instagram/memberAccount.ts PUBLISH_SCOPES와 같음)
const PUBLISH_SCOPES: Record<string, string[]> = {
  instagram_login: ["instagram_business_basic", "instagram_business_content_publish"],
  facebook_login: ["instagram_basic", "instagram_content_publish"],
};

export async function getMemberInstagramAccount(userId: string): Promise<MemberInstagramAccount | null> {
  const shared = await getMemberAccount(createAdminClient(), userId, "instagram");
  if (shared.status !== "not_connected") {
    const a = shared.account;
    const need = a.authMethod ? PUBLISH_SCOPES[a.authMethod] : undefined;
    if (need && !a.needsReconnect && need.every((sc) => a.grantedScopes.includes(sc))) {
      const expiresAt = a.tokenExpiresAt ? new Date(a.tokenExpiresAt).getTime() : null;
      return {
        igUserId: a.externalId,
        username: a.username ?? "",
        accessToken: a.accessToken,
        authMethod: a.authMethod === "facebook_login" ? "facebook_login" : "instagram_login",
        expired: expiresAt !== null && expiresAt <= Date.now(),
      };
    }
  }

  const { data, error } = await createAdminClient()
    .from("insta_accounts")
    .select("ig_user_id, ig_username, access_token, token_expires_at, auth_method")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data?.access_token || !data.ig_user_id) return null;
  const expiresAt = data.token_expires_at ? new Date(data.token_expires_at).getTime() : null;
  return {
    igUserId: data.ig_user_id,
    username: data.ig_username ?? "",
    accessToken: data.access_token,
    authMethod: data.auth_method === "facebook_login" ? "facebook_login" : "instagram_login",
    expired: expiresAt !== null && expiresAt <= Date.now(),
  };
}
