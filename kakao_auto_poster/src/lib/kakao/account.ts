import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { resolveApiKey } from "@/lib/apiKeys";
import { refreshAccessToken } from "@/lib/kakao/client";

type SupabaseLike = {
  from: (table: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
};

interface KakaoAccountRow {
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
}

export interface KakaoAppCredentials {
  restApiKey: string;
  clientSecret: string | null;
}

// access_token 만료 5분 전부터는 미리 갱신한다 — 발송 도중 만료되는 경계 상황 방지.
const EXPIRY_BUFFER_MS = 5 * 60 * 1000;

/**
 * 회원 본인이 설정 페이지에 등록한 카카오 앱의 REST API 키/Client Secret을 조회한다
 * (user_api_keys, resolveApiKey() — 본인 키만, 관리자 키로 폴백 없음). REST API 키가 없으면
 * 이 회원은 아직 본인 카카오 앱을 등록하지 않은 것이므로 null을 반환한다. Client Secret은
 * 카카오 콘솔에서 "활성화"를 켠 경우에만 필요한 선택 항목이라 없어도 무방하다.
 */
export async function resolveKakaoAppCredentials(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<KakaoAppCredentials | null> {
  const restApiKey = await resolveApiKey(supabase, userId, "kakao_rest_api_key");
  if (!restApiKey) return null;
  const clientSecret = await resolveApiKey(supabase, userId, "kakao_client_secret");
  return { restApiKey, clientSecret };
}

/**
 * user_kakao_accounts에 저장된 access_token이 곧 만료되면 refresh_token으로 갱신하고 DB에
 * 반영한 뒤, 항상 유효한 access_token을 반환한다. 텔레그램 승인 웹훅처럼 사용자 세션이 없는
 * 곳에서도 호출되므로 admin/service-role 클라이언트를 받아 RLS 없이 동작한다.
 *
 * credentials(회원 본인의 카카오 앱 REST API 키/Client Secret)가 없으면 — 예전 공용 앱
 * 시절에 이미 연동된 기존 토큰이 아직 유효한 동안은 그대로 반환하지만, 갱신이 필요한
 * 시점에는 갱신할 수 없으므로 조용히 null을 반환한다. 호출부(kakaoSend.ts)가 이를 SOLAPI 등
 * 다른 발송 경로로의 자연스러운 폴백 신호로 쓴다 — 에러를 던져 발송 자체를 실패시키지 않는다.
 */
export async function getValidKakaoAccessToken(
  supabase: SupabaseLike,
  userId: string,
  credentials: KakaoAppCredentials | null,
): Promise<string | null> {
  const { data: account } = await supabase
    .from("user_kakao_accounts")
    .select("access_token, refresh_token, token_expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (!account) return null;
  const row = account as KakaoAccountRow;

  const expiresAt = new Date(row.token_expires_at).getTime();
  if (expiresAt - Date.now() > EXPIRY_BUFFER_MS) {
    return row.access_token;
  }

  if (!credentials) return null;

  const refreshed = await refreshAccessToken(row.refresh_token, credentials.restApiKey, credentials.clientSecret);
  const tokenExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
  const refreshTokenExpiresAt = refreshed.refresh_token_expires_in
    ? new Date(Date.now() + refreshed.refresh_token_expires_in * 1000).toISOString()
    : undefined;

  await supabase
    .from("user_kakao_accounts")
    .update({
      access_token: refreshed.access_token,
      // 카카오는 refresh_token 갱신 응답에 새 refresh_token을 항상 주지는 않는다 — 온 경우만 교체.
      ...(refreshed.refresh_token ? { refresh_token: refreshed.refresh_token } : {}),
      token_expires_at: tokenExpiresAt,
      ...(refreshTokenExpiresAt ? { refresh_token_expires_at: refreshTokenExpiresAt } : {}),
    })
    .eq("user_id", userId);

  return refreshed.access_token;
}
