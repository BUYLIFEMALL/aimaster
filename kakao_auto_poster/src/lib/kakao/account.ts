import "server-only";
import { refreshAccessToken } from "@/lib/kakao/client";

type SupabaseLike = {
  from: (table: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
};

interface KakaoAccountRow {
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
}

// access_token 만료 5분 전부터는 미리 갱신한다 — 발송 도중 만료되는 경계 상황 방지.
const EXPIRY_BUFFER_MS = 5 * 60 * 1000;

/**
 * user_kakao_accounts에 저장된 access_token이 곧 만료되면 refresh_token으로 갱신하고 DB에
 * 반영한 뒤, 항상 유효한 access_token을 반환한다. 텔레그램 승인 웹훅처럼 사용자 세션이 없는
 * 곳에서도 호출되므로 admin/service-role 클라이언트를 받아 RLS 없이 동작한다.
 */
export async function getValidKakaoAccessToken(
  supabase: SupabaseLike,
  userId: string,
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

  const refreshed = await refreshAccessToken(row.refresh_token);
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
