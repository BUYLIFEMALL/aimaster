import "server-only";
// 워드프레스 연결(2-2) — 회원 본인 사이트·본인 응용 비밀번호만. 공용 연결 표(member_platform_accounts)에 저장해
// 다른 AIMaster 프로그램도 다시 묻지 않고 쓴다(docs/MEMBER_INTEGRATIONS.md).
// 서버가 회원이 넣은 주소로 요청하므로 공용 safe-fetch(내부·사설 주소 차단, 리디렉트 재검사)로만 보낸다.
import { safeFetch, BlockedUrlError } from "./safeFetch";
import { getMemberAccount, saveMemberAccount, type MemberPlatform } from "./memberIntegrations";
import { normalizeSiteUrl, verifyConnection, listCategories, type WpConnection, type WpDeps } from "./publish/wordpress";
import { PublishError } from "./publish/types";
import type { FetchLike } from "./publish/http";

// 공용 기준의 MemberPlatform 형식에 아직 wordpress가 없다(기준을 고칠 때 추가 — docs/IMPROVEMENTS.md). 값은 카탈로그에 등록돼 있다.
const WORDPRESS = "wordpress" as unknown as MemberPlatform;
export const CONNECTED_VIA = "wp-blogger-auto";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminDb = { from: (table: string) => any };

/** 내부망 차단 fetch — 발행 엔진(FetchLike)에 끼워 쓴다 */
export const safeFetchImpl: FetchLike = async (url, init) => {
  try {
    return (await safeFetch(url, init)).response;
  } catch (e) {
    if (e instanceof BlockedUrlError) throw new PublishError("bad_request", `이 주소로는 연결할 수 없습니다: ${e.message}`);
    throw e;
  }
};

export type ConnectInput = { siteUrl: string; username: string; appPassword: string };
export type ConnectResult = {
  siteUrl: string;
  accountName: string;
  canPublish: boolean;
  categories: { id: number; name: string; parent: number }[];
};

/** 연결 확인 → 발행 권한 확인 → 카테고리 → 공용 표 저장 */
export async function connectWordpress(admin: AdminDb, userId: string, input: ConnectInput, deps: WpDeps = { fetchImpl: safeFetchImpl }): Promise<ConnectResult> {
  const siteUrl = normalizeSiteUrl(input.siteUrl);
  const username = String(input.username || "").trim();
  // 응용 비밀번호는 4글자씩 띄어 보여 주지만 띄어쓰기를 빼도 같다
  const appPassword = String(input.appPassword || "").replace(/\s+/g, "");
  if (!username || username.length > 120) throw new PublishError("bad_request", "사용자명을 확인해 주세요.");
  if (appPassword.length < 16 || appPassword.length > 64) throw new PublishError("bad_request", "응용 비밀번호를 확인해 주세요(보통 24글자).");

  const conn: WpConnection = { siteUrl, username, appPassword };
  const me = await verifyConnection(conn, deps);
  if (!me.canPublish) throw new PublishError("forbidden", "이 계정에는 글 발행 권한이 없습니다. 관리자·편집자·글쓴이 권한 계정으로 연결해 주세요.");
  const categories = await listCategories(conn, deps);

  const { error } = await saveMemberAccount(admin, {
    userId,
    platform: WORDPRESS,
    externalId: `${siteUrl}#${me.userId}`,
    username,
    accessToken: appPassword,
    grantedScopes: ["publish"],
    authMethod: "app_password",
    extra: { site_url: siteUrl, rest_style: me.restStyle, site_name: new URL(siteUrl).host, account_name: me.name },
    connectedVia: CONNECTED_VIA,
  });
  if (error) throw new PublishError("server", "연결 정보를 저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
  return { siteUrl, accountName: me.name, canPublish: true, categories };
}

/** 저장된 연결 → 발행 엔진용 연결값(없으면 null) */
export async function loadWordpressConnection(admin: AdminDb, userId: string): Promise<(WpConnection & { accountId: string }) | null> {
  const r = await getMemberAccount(admin, userId, WORDPRESS, { authMethod: "app_password" });
  if (r.status === "not_connected") return null;
  const a = r.account;
  const extra = a.extra as { site_url?: string; rest_style?: "path" | "query" };
  if (!extra.site_url || !a.username) return null;
  return { accountId: a.id, siteUrl: extra.site_url, username: a.username, appPassword: a.accessToken, restStyle: extra.rest_style };
}

/** 연결 끊기 — 본인 줄만 지운다 */
export async function disconnectWordpress(admin: AdminDb, userId: string, accountId: string): Promise<boolean> {
  const { data, error } = await admin
    .from("member_platform_accounts")
    .delete()
    .eq("id", accountId)
    .eq("user_id", userId)
    .eq("platform", "wordpress")
    .select("id");
  return !error && Array.isArray(data) && data.length === 1;
}

/** 화면에 보여 줄 오류(비밀값 없이) */
export function connectErrorView(e: unknown): { status: number; error: string; code: string; htaccessHint: boolean } {
  if (e instanceof PublishError) {
    const status = e.code === "bad_request" ? 400 : e.code === "auth" || e.code === "auth_header_stripped" ? 401 : e.code === "forbidden" ? 403 : e.code === "not_found" ? 404 : 502;
    return { status, error: e.message, code: e.code, htaccessHint: e.code === "auth_header_stripped" };
  }
  return { status: 500, error: "연결 중 알 수 없는 오류가 났습니다. 잠시 뒤 다시 시도해 주세요.", code: "unknown", htaccessHint: false };
}
