import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMemberAccount, saveMemberAccount } from "@/lib/memberIntegrations";

// 회원 연동 정보 공용 저장 ⑤단계(v1.24, 2026-10-20 — 루트 docs/MEMBER_INTEGRATIONS.md).
// 공용 네이버 로그인 계정이 있으면 그것을 쓰고, 없으면 이 프로그램 표(ncafe_accounts)를 쓴다. 둘 다 회원 본인 값이다.
// 갱신 토큰은 발급한 네이버 앱으로만 쓸 수 있어서, 공용 계정의 앱(app_ref)이 지금 등록한 naver_client_id와 같을 때만 쓴다.
// 네이버 로그인은 권한 이름이 없어(앱 설정에서 고름) 권한 조건은 보지 않는다.

export const PROGRAM_SLUG = "naver-cafe-poster";

type Db = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

export type NaverAccount = {
  naver_id: string;
  nickname: string | null;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  /** 공용 계정이면 member_platform_accounts.id, 이 프로그램 표면 null */
  shared_id: string | null;
};

/** clientId: 회원이 지금 등록한 네이버 Client ID(없으면 공용 계정은 쓰지 않음 — 같은 앱인지 확인할 수 없음) */
export async function getNaverAccount(db: Db, userId: string, clientId: string | null): Promise<NaverAccount | null> {
  if (clientId) {
    const shared = await getMemberAccount(createAdminClient(), userId, "naver_login");
    if (shared.status === "ok" && !shared.account.needsReconnect && shared.account.appRef === clientId) {
      return {
        naver_id: shared.account.externalId,
        nickname: shared.account.username,
        access_token: shared.account.accessToken,
        refresh_token: shared.account.refreshToken,
        token_expires_at: shared.account.tokenExpiresAt,
        shared_id: shared.account.id,
      };
    }
  }

  const { data, error } = await db
    .from("ncafe_accounts")
    .select("naver_id, nickname, access_token, refresh_token, token_expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? { ...data, shared_id: null } : null;
}

/** 연결 콜백에서 공용 표에도 저장(이중 기록). 실패해도 이 프로그램 연결은 그대로 — 기록만 남김 */
export async function saveSharedNaverAccount(input: {
  userId: string;
  naverId: string;
  nickname: string | null;
  accessToken: string;
  refreshToken: string | null;
  tokenExpiresAt: string | null;
  clientId: string;
}) {
  const { error } = await saveMemberAccount(createAdminClient(), {
    userId: input.userId,
    platform: "naver_login",
    externalId: input.naverId,
    username: input.nickname,
    accessToken: input.accessToken,
    refreshToken: input.refreshToken,
    tokenExpiresAt: input.tokenExpiresAt,
    grantedScopes: [],
    appRef: input.clientId,
    connectedVia: PROGRAM_SLUG,
  });
  if (error) console.error("[naver-cafe-poster] 공용 연결 계정 저장 실패", error);
}

/** 연결 해제 — 공용 표의 네이버 계정도 지운다(남겨 두면 해제해도 계속 연결된 상태로 보임) */
export async function deleteSharedNaverAccount(userId: string) {
  // 이 프로그램의 DB 타입에는 공용 표가 없어 느슨한 타입으로 부른다(공용 부품과 같은 방식)
  await (createAdminClient() as unknown as Db).from("member_platform_accounts").delete().eq("user_id", userId).eq("platform", "naver_login");
}
