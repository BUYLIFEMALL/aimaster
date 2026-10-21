import "server-only";
import { refreshThreadsLongLivedToken } from "@/lib/threads/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { markMemberAccountNeedsReconnect, updateMemberAccountToken } from "@/lib/memberIntegrations";

// 토큰 갱신·재연결 표시 — 2026-10-21 "use server" 연결 파일(lib/actions/threads.ts)에서 그대로 옮김(내용 같음).
// 게시·동기화 코드가 연결(OAuth)·권한 코드와 분리돼 통합 받은편지함(comment-inbox)도 같은 코드를 사본으로 쓴다.

/**
 * 쓰레드 장기 토큰(60일)이 만료 임박이면 자체 갱신(th_refresh_token)한다.
 * 유튜브와 달리 별도 refresh_token이 없고, 같은 access_token으로 스스로를 갱신한다.
 */
export async function getValidThreadsAccessToken(
  supabase: SupabaseClient<Database>,
  userId: string,
  account: { access_token: string; token_expires_at: string | null; shared_id?: string | null },
): Promise<string> {
  const expiresAt = account.token_expires_at ? new Date(account.token_expires_at).getTime() : 0;
  // 만료 3일 이내면 미리 갱신한다(공식 문서: 발급 후 24시간~60일 사이 갱신 가능, 여유를 더 둠).
  const isExpiringSoon = expiresAt < Date.now() + 3 * 24 * 60 * 60 * 1000;
  if (!isExpiringSoon) return account.access_token;

  try {
    const refreshed = await refreshThreadsLongLivedToken(account.access_token);
    const tokenExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
    // v1.13: 공용 연결 계정에서 읽은 토큰이면 공용 표를 갱신(다른 Threads 프로그램도 새 토큰을 씀)
    if (account.shared_id) {
      await updateMemberAccountToken(createAdminClient(), userId, account.shared_id, {
        accessToken: refreshed.access_token,
        tokenExpiresAt,
      });
      return refreshed.access_token;
    }
    await supabase
      .from("th_accounts")
      .update({
        access_token: refreshed.access_token,
        token_expires_at: tokenExpiresAt,
        needs_reconnect: false,
        last_checked_at: new Date().toISOString(),
        reconnect_notified_at: null,
      })
      .eq("user_id", userId);
    return refreshed.access_token;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.startsWith("THREADS_TOKEN_EXPIRED:")) {
      if (account.shared_id) await markMemberAccountNeedsReconnect(createAdminClient(), userId, account.shared_id);
      else await markNeedsReconnect(supabase, userId);
      throw new Error("THREADS_RECONNECT_REQUIRED");
    }
    throw err;
  }
}

export async function markNeedsReconnect(supabase: SupabaseClient<Database>, userId: string): Promise<void> {
  await supabase
    .from("th_accounts")
    .update({ needs_reconnect: true, last_checked_at: new Date().toISOString() })
    .eq("user_id", userId);
}
