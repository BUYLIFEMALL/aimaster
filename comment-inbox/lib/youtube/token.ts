import "server-only";
import { refreshYoutubeAccessToken } from "@/lib/youtube/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { markMemberAccountNeedsReconnect, updateMemberAccountToken } from "@/lib/memberIntegrations";

// 토큰 갱신·재연결 표시 — 2026-10-21 "use server" 연결 파일(lib/actions/youtube.ts)에서 그대로 옮김(내용 같음).
// 게시·동기화 코드가 연결(OAuth)·권한 코드와 분리돼 통합 받은편지함(comment-inbox)도 같은 코드를 사본으로 쓴다.

/** access_token 만료 임박/만료 시 refresh_token으로 갱신하고 DB에 반영한다. */
export async function getValidYoutubeAccessToken(
  supabase: SupabaseClient<Database>,
  userId: string,
  account: { access_token: string; refresh_token: string; token_expires_at: string | null; shared_id?: string | null },
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const expiresAt = account.token_expires_at ? new Date(account.token_expires_at).getTime() : 0;
  const isExpiringSoon = expiresAt < Date.now() + 60_000;
  if (!isExpiringSoon) return account.access_token;

  try {
    const refreshed = await refreshYoutubeAccessToken(account.refresh_token, clientId, clientSecret);
    const tokenExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
    // v1.14: 공용 연결 계정에서 읽은 토큰이면 공용 표를 갱신(다른 YouTube 프로그램도 새 토큰을 씀)
    if (account.shared_id) {
      await updateMemberAccountToken(createAdminClient(), userId, account.shared_id, {
        accessToken: refreshed.access_token,
        tokenExpiresAt,
      });
      return refreshed.access_token;
    }
    await supabase
      .from("ytreply_accounts")
      .update({
        access_token: refreshed.access_token,
        token_expires_at: tokenExpiresAt,
        needs_reconnect: false,
        last_checked_at: new Date().toISOString(),
        reconnect_notified_at: null, // 다음에 다시 끊기면 새로 알림을 보낼 수 있도록 초기화
      })
      .eq("user_id", userId);
    return refreshed.access_token;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.startsWith("YOUTUBE_TOKEN_EXPIRED:")) {
      if (account.shared_id) await markMemberAccountNeedsReconnect(createAdminClient(), userId, account.shared_id);
      else await markNeedsReconnect(supabase, userId);
      throw new Error("YOUTUBE_RECONNECT_REQUIRED");
    }
    throw err;
  }
}

/** 실제 사용(영상/댓글 동기화, 답글 게시) 또는 정기 점검(cron) 중 재연결이 필요하다고
 * 판단되면 화면 배너용으로 상태를 저장해둔다. */
export async function markNeedsReconnect(supabase: SupabaseClient<Database>, userId: string): Promise<void> {
  await supabase
    .from("ytreply_accounts")
    .update({ needs_reconnect: true, last_checked_at: new Date().toISOString() })
    .eq("user_id", userId);
}
