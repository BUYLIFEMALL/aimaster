import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMemberAccount, saveMemberAccount } from "@/lib/memberIntegrations";

// 회원 연동 정보 공용 저장 ⑤단계(v1.24, 2026-10-20 — 루트 docs/MEMBER_INTEGRATIONS.md).
// 「나에게 보내기」 권한(talk_message)을 받은 공용 카카오 계정이 있으면 그것을 쓰고, 없으면 이 프로그램 표(user_kakao_accounts)를 쓴다. 둘 다 회원 본인 값이다.
// 갱신 토큰은 발급한 카카오 앱으로만 쓸 수 있어서, 공용 계정의 앱(app_ref)이 지금 등록한 REST API 키와 같을 때만 쓴다.

export const PROGRAM_SLUG = "kakao-auto-posting";
// lib/kakao/client.ts KAKAO_SCOPES와 같은 목록
export const KAKAO_SCOPES_LIST = ["talk_message"];

type Db = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

export type KakaoAccount = {
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  nickname: string | null;
  /** 공용 계정이면 member_platform_accounts.id, 이 프로그램 표면 null */
  shared_id: string | null;
};

/** restApiKey: 회원이 지금 등록한 카카오 REST API 키(없으면 공용 계정은 쓰지 않음 — 같은 앱인지 확인할 수 없음) */
export async function getKakaoAccount(db: Db, userId: string, restApiKey: string | null): Promise<KakaoAccount | null> {
  if (restApiKey) {
    const shared = await getMemberAccount(createAdminClient(), userId, "kakao", { needScopes: KAKAO_SCOPES_LIST });
    if (
      shared.status === "ok" &&
      !shared.account.needsReconnect &&
      shared.account.refreshToken &&
      shared.account.tokenExpiresAt &&
      shared.account.appRef === restApiKey
    ) {
      return {
        access_token: shared.account.accessToken,
        refresh_token: shared.account.refreshToken,
        token_expires_at: shared.account.tokenExpiresAt,
        nickname: shared.account.username,
        shared_id: shared.account.id,
      };
    }
  }

  const { data } = await db
    .from("user_kakao_accounts")
    .select("access_token, refresh_token, token_expires_at, nickname")
    .eq("user_id", userId)
    .maybeSingle();
  return data ? { ...data, shared_id: null } : null;
}

/** 연결 콜백에서 공용 표에도 저장(이중 기록). 실패해도 이 프로그램 연결은 그대로 — 기록만 남김 */
export async function saveSharedKakaoAccount(input: {
  userId: string;
  kakaoUserId: string;
  nickname: string | null;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: string;
  refreshTokenExpiresAt: string | null;
  restApiKey: string;
}) {
  const { error } = await saveMemberAccount(createAdminClient(), {
    userId: input.userId,
    platform: "kakao",
    externalId: input.kakaoUserId,
    username: input.nickname,
    accessToken: input.accessToken,
    refreshToken: input.refreshToken,
    tokenExpiresAt: input.tokenExpiresAt,
    refreshExpiresAt: input.refreshTokenExpiresAt,
    grantedScopes: KAKAO_SCOPES_LIST,
    appRef: input.restApiKey,
    connectedVia: PROGRAM_SLUG,
  });
  if (error) console.error("[kakao_auto_poster] 공용 연결 계정 저장 실패", error);
}

/** 연결 해제 — 공용 표의 카카오 계정도 지운다(남겨 두면 해제해도 계속 연결된 상태로 보임) */
export async function deleteSharedKakaoAccount(userId: string) {
  await createAdminClient().from("member_platform_accounts").delete().eq("user_id", userId).eq("platform", "kakao");
}
