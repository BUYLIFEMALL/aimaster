// 회원 연동 정보 공용 저장 — 기준 코드(2026-10-20, docs/PLAN_20261020_MEMBER_INTEGRATIONS.md).
// 한 번 연결한 플랫폼 계정(Threads·Instagram·YouTube·카카오·네이버 로그인)을 모든 프로그램이 함께 쓴다.
// 표: integration_catalog(항목 목록), member_platform_accounts(회원별 연결 계정, 0039 마이그레이션).
// 토큰은 서버(서비스 키)만 읽는다 — 회원 화면은 토큰 칸에 권한이 없다.
// 서브프로그램은 이 파일의 사본을 글자 그대로 쓴다(scripts/check-shared-modules.mjs 「member-integrations」). 기준은 이 파일만 고친다.
// 프로그램마다 서버 클라이언트 import가 달라서, 모든 함수는 서비스 키 클라이언트(admin)를 인자로 받는다 — 브라우저 코드에서 부르지 않는다.
// 최상위 규칙: 회원 본인 계정만. 다른 회원·운영자 계정으로 대신 처리하지 않는다(userId로 항상 거른다).

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminDb = { from: (table: string) => any };

export type MemberPlatform = "threads" | "instagram" | "youtube" | "kakao" | "naver_login";

export type MemberAccount = {
  id: string;
  platform: MemberPlatform;
  externalId: string;
  username: string | null;
  accessToken: string;
  refreshToken: string | null;
  tokenExpiresAt: string | null;
  grantedScopes: string[];
  authMethod: string | null;
  appRef: string | null;
  extra: Record<string, unknown>;
  needsReconnect: boolean;
  connectedVia: string | null;
};

/** ok = 사용 가능 / missing_scopes = 연결은 있지만 권한 추가 연결 필요 / not_connected = 한 번 연결 필요 */
export type MemberAccountResult =
  | { status: "ok"; account: MemberAccount }
  | { status: "missing_scopes"; account: MemberAccount; missing: string[] }
  | { status: "not_connected"; connectProgramUrl: string | null };

type Row = {
  id: string;
  platform: MemberPlatform;
  external_id: string;
  username: string | null;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  granted_scopes: string[] | null;
  auth_method: string | null;
  app_ref: string | null;
  extra: Record<string, unknown> | null;
  needs_reconnect: boolean;
  connected_via: string | null;
};

const toAccount = (r: Row): MemberAccount => ({
  id: r.id,
  platform: r.platform,
  externalId: r.external_id,
  username: r.username,
  accessToken: r.access_token,
  refreshToken: r.refresh_token,
  tokenExpiresAt: r.token_expires_at,
  grantedScopes: r.granted_scopes ?? [],
  authMethod: r.auth_method,
  appRef: r.app_ref,
  extra: r.extra ?? {},
  needsReconnect: r.needs_reconnect,
  connectedVia: r.connected_via,
});

/** 필요한 권한 중 받지 않은 것 */
export function missingScopes(granted: string[], need: string[]): string[] {
  const have = new Set(granted);
  return need.filter((s) => !have.has(s));
}

/**
 * 회원의 연결 계정을 가져온다. 기본 계정(is_default) → 최근 갱신 순.
 * needScopes를 주면 받은 권한이 모자랄 때 missing_scopes로 알려준다(호출부는 「권한 추가 연결」 안내).
 */
export async function getMemberAccount(
  admin: AdminDb,
  userId: string,
  platform: MemberPlatform,
  opts: { needScopes?: string[] } = {}
): Promise<MemberAccountResult> {
  const { data } = await admin
    .from("member_platform_accounts")
    .select(
      "id, platform, external_id, username, access_token, refresh_token, token_expires_at, granted_scopes, auth_method, app_ref, extra, needs_reconnect, connected_via"
    )
    .eq("user_id", userId)
    .eq("platform", platform)
    .order("is_default", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) {
    const { data: item } = await admin
      .from("integration_catalog")
      .select("connect_program_url")
      .eq("key", platform)
      .maybeSingle();
    return { status: "not_connected", connectProgramUrl: item?.connect_program_url ?? null };
  }

  const account = toAccount(data as Row);
  const missing = missingScopes(account.grantedScopes, opts.needScopes ?? []);
  return missing.length ? { status: "missing_scopes", account, missing } : { status: "ok", account };
}

export type SaveMemberAccountInput = {
  userId: string;
  platform: MemberPlatform;
  externalId: string;
  username?: string | null;
  accessToken: string;
  refreshToken?: string | null;
  tokenExpiresAt?: string | null;
  refreshExpiresAt?: string | null;
  grantedScopes: string[];
  authMethod?: string | null;
  appRef?: string | null;
  extra?: Record<string, unknown>;
  connectedVia: string; // 연결한 프로그램 slug
};

/**
 * OAuth 콜백에서 저장한다. 같은 계정이 이미 있으면 새 토큰으로 바꾼다.
 * 권한(granted_scopes)은 **이번 연결에서 요청한 권한만** 적는다 — 이전 권한과 합치지 않는다(2026-10-20 정정).
 * 예: 댓글 프로그램에서 받은 토큰을 게시 프로그램이 다시 연결해 바꾸면, 새 토큰에 댓글 권한이 있다고 보장할 수 없다.
 * 이렇게 적으면 권한이 모자란 프로그램은 missing_scopes를 받고 자기 표의 토큰을 쓰므로 안전하다.
 */
export async function saveMemberAccount(admin: AdminDb, input: SaveMemberAccountInput): Promise<{ error: string | null }> {
  const { data: existing } = await admin
    .from("member_platform_accounts")
    .select("app_ref, refresh_token")
    .eq("user_id", input.userId)
    .eq("platform", input.platform)
    .eq("external_id", input.externalId)
    .maybeSingle();

  const sameApp = existing && (existing.app_ref ?? null) === (input.appRef ?? null);
  const scopes = Array.from(new Set(input.grantedScopes));

  const { error } = await admin.from("member_platform_accounts").upsert(
    {
      user_id: input.userId,
      platform: input.platform,
      external_id: input.externalId,
      username: input.username ?? null,
      access_token: input.accessToken,
      // refresh_token을 새로 주지 않는 플랫폼(재동의 없이 갱신 등)은 기존 값을 지키지 않으면 갱신이 끊긴다
      refresh_token: input.refreshToken ?? (sameApp ? existing?.refresh_token ?? null : null),
      token_expires_at: input.tokenExpiresAt ?? null,
      refresh_expires_at: input.refreshExpiresAt ?? null,
      granted_scopes: scopes,
      auth_method: input.authMethod ?? null,
      app_ref: input.appRef ?? null,
      extra: input.extra ?? {},
      needs_reconnect: false,
      connected_via: input.connectedVia,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,platform,external_id" }
  );
  return { error: error?.message ?? null };
}

/** 토큰 갱신 결과 저장(권한·연결 정보는 그대로) */
export async function updateMemberAccountToken(
  admin: AdminDb,
  userId: string,
  accountId: string,
  token: { accessToken: string; tokenExpiresAt?: string | null; refreshToken?: string | null }
): Promise<{ error: string | null }> {
  const patch: Record<string, unknown> = {
    access_token: token.accessToken,
    token_expires_at: token.tokenExpiresAt ?? null,
    needs_reconnect: false,
    updated_at: new Date().toISOString(),
  };
  if (token.refreshToken) patch.refresh_token = token.refreshToken;
  const { error } = await admin
    .from("member_platform_accounts")
    .update(patch)
    .eq("id", accountId)
    .eq("user_id", userId);
  return { error: error?.message ?? null };
}

/** 토큰이 만료·폐기돼 다시 연결이 필요하다고 표시 */
export async function markMemberAccountNeedsReconnect(admin: AdminDb, userId: string, accountId: string): Promise<void> {
  await admin
    .from("member_platform_accounts")
    .update({ needs_reconnect: true, last_checked_at: new Date().toISOString() })
    .eq("id", accountId)
    .eq("user_id", userId);
}
