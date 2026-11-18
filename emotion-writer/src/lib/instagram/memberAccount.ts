import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMemberAccount } from "@/lib/memberIntegrations";

// 회원 연동 정보 공용 저장·재사용 규칙(루트 CLAUDE.md 최상위 지침):
// 인스타그램 연결은 INSTA 포스팅 자동화에서 회원이 한 번 연결한 값(공용 DB `member_platform_accounts` 또는 `insta_accounts`)을 그대로 사용합니다.
// 로그인한 회원 본인 행만 읽고(user_id 조건), 토큰은 서버 안에서만 쓰며 클라이언트로는 공개 가능한 정보(연동 여부, 계정명, 만료 여부)만 보냅니다.

export const INSTA_CONNECT_URL = "https://auto-instagram-posting.buylife.xyz/settings";
export const INSTA_NEW_POST_URL = "https://auto-instagram-posting.buylife.xyz/posts/new";

export type InstagramAuthMethod = "facebook_login" | "instagram_login";

export interface MemberInstagramAccount {
  igUserId: string;
  username: string;
  accessToken: string;
  authMethod: InstagramAuthMethod;
  expired: boolean;
}

export interface InstagramPublicStatus {
  connected: boolean;
  username: string | null;
  expired: boolean;
  connectUrl: string;
}

// 로그인 방식별 게시에 꼭 필요한 권한
const PUBLISH_SCOPES: Record<string, string[]> = {
  instagram_login: ["instagram_business_basic", "instagram_business_content_publish"],
  facebook_login: ["instagram_basic", "instagram_content_publish"],
};

export async function getMemberInstagramAccount(
  userId: string,
): Promise<MemberInstagramAccount | null> {
  // 1. 공용 연결 계정(member_platform_accounts) 우선 조회
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

  // 2. 기존 insta_accounts 테이블 조회 (대체 경로 호환)
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

export async function getInstagramPublicStatus(
  userId: string,
): Promise<InstagramPublicStatus> {
  const account = await getMemberInstagramAccount(userId);
  if (!account) {
    return {
      connected: false,
      username: null,
      expired: false,
      connectUrl: INSTA_CONNECT_URL,
    };
  }
  return {
    connected: true,
    username: account.username || null,
    expired: account.expired,
    connectUrl: INSTA_CONNECT_URL,
  };
}
