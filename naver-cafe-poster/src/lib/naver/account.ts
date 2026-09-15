import "server-only";
import { refreshNaverToken } from "@/lib/naver/client";

// 회원 세션이 있는 서버 액션(lib/actions/posts.ts)과, 세션이 없는 예약 자동화 크론
// (app/api/cron/generate-and-post/route.ts, admin 클라이언트) 양쪽에서 "네이버 계정
// 토큰 가져오기/게시 대상 카페 조회하기"를 똑같이 써야 해서 여기 하나로 모았다 —
// kakao_auto_poster의 lib/kakaoSend.ts와 동일한 분리 이유.
type SupabaseLike = {
  from: (table: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
};

/**
 * 네이버 access token은 발급 후 약 1시간이면 만료된다 — 게시 직전에 만료(또는 임박) 여부를
 * 확인해서 필요하면 refresh_token으로 갱신하고 DB에도 반영한다.
 */
export async function getNaverAccountOrError(supabase: SupabaseLike, userId: string) {
  const { data, error } = await supabase.from("ncafe_accounts").select("*").eq("user_id", userId).maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("먼저 네이버 계정을 연결해주세요.");

  const expiresAt = data.token_expires_at ? new Date(data.token_expires_at).getTime() : 0;
  const isExpiringSoon = expiresAt - Date.now() < 5 * 60 * 1000; // 5분 여유를 두고 미리 갱신

  if (!isExpiringSoon) {
    return data;
  }

  if (!data.refresh_token) {
    throw new Error("네이버 로그인이 만료되었습니다. 설정 페이지에서 네이버 계정을 다시 연결해주세요.");
  }

  // 네이버 로그인 서버 호출이 간헐적으로 "Gateway Timeout" 같은 원시 네트워크 오류로 실패하는
  // 현상을 실계정 게시 시도에서 재현했다(2026-09-12) — 카페 글쓰기 API 재시도(publish-core.ts)와
  // 동일하게 한 번 더 시도해본다.
  let refreshed: Awaited<ReturnType<typeof refreshNaverToken>> | undefined;
  let refreshError: unknown;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      refreshed = await refreshNaverToken(data.refresh_token);
      refreshError = undefined;
      break;
    } catch (err) {
      refreshError = err;
    }
  }
  if (!refreshed) {
    const rawMessage = refreshError instanceof Error ? refreshError.message : "알 수 없는 오류가 발생했습니다.";
    throw new Error(
      rawMessage.startsWith("네이버 토큰 갱신에 실패했습니다")
        ? rawMessage
        : `네이버 로그인 서버 응답이 지연되어 토큰 갱신에 실패했습니다 (${rawMessage}). 잠시 후 다시 시도해주세요.`,
    );
  }
  const expiresInSeconds = Number(refreshed.expires_in);
  const tokenExpiresAt = Number.isFinite(expiresInSeconds)
    ? new Date(Date.now() + expiresInSeconds * 1000).toISOString()
    : null;

  const { error: updateError } = await supabase
    .from("ncafe_accounts")
    .update({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token ?? data.refresh_token,
      token_expires_at: tokenExpiresAt,
    })
    .eq("user_id", userId);

  if (updateError) throw new Error(updateError.message);

  return {
    ...data,
    access_token: refreshed.access_token,
    refresh_token: refreshed.refresh_token ?? data.refresh_token,
    token_expires_at: tokenExpiresAt,
  };
}

export async function getTargetOrError(supabase: SupabaseLike, userId: string, targetId: string) {
  const { data, error } = await supabase
    .from("ncafe_targets")
    .select("*")
    .eq("id", targetId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("등록된 카페 정보를 찾을 수 없습니다.");
  return data;
}
