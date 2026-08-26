"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/apiKeys";
import { buildOAuthState } from "@/lib/oauthState";
import { getInstagramAuthorizeUrl, refreshInstagramLongLivedToken } from "@/lib/instagram/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export interface ConnectInstagramState {
  error?: string;
}

export async function connectInstagramAction(
  _prevState: ConnectInstagramState,
  formData: FormData,
): Promise<ConnectInstagramState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const appId = await resolveApiKey(supabase, user.id, "meta_app_id");
  if (!appId) {
    return { error: "설정 페이지에서 Meta App ID를 먼저 등록해주세요." };
  }
  const returnTo = String(formData.get("returnTo") ?? "");
  redirect(getInstagramAuthorizeUrl(buildOAuthState(user.id, returnTo), appId));
}

export async function disconnectInstagramAction() {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  await supabase.from("dm_accounts").delete().eq("user_id", user.id);
  revalidatePath("/settings");
}

/**
 * 인스타그램 장기 토큰(60일)이 만료 임박이면 자체 갱신(ig_refresh_token)한다.
 * 별도 refresh_token이 없고, 같은 access_token으로 스스로를 갱신한다.
 */
export async function getValidInstagramAccessToken(
  supabase: SupabaseClient<Database>,
  userId: string,
  account: { access_token: string; token_expires_at: string | null },
): Promise<string> {
  const expiresAt = account.token_expires_at ? new Date(account.token_expires_at).getTime() : 0;
  // 만료 3일 이내면 미리 갱신한다(공식 문서: 만료 24시간 전부터 갱신 가능, 여유를 더 둠).
  const isExpiringSoon = expiresAt < Date.now() + 3 * 24 * 60 * 60 * 1000;
  if (!isExpiringSoon) return account.access_token;

  try {
    const refreshed = await refreshInstagramLongLivedToken(account.access_token);
    const tokenExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
    await supabase
      .from("dm_accounts")
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
    if (message.startsWith("INSTAGRAM_TOKEN_EXPIRED:")) {
      await markNeedsReconnect(supabase, userId);
      throw new Error("INSTAGRAM_RECONNECT_REQUIRED");
    }
    throw err;
  }
}

export async function markNeedsReconnect(supabase: SupabaseClient<Database>, userId: string): Promise<void> {
  await supabase
    .from("dm_accounts")
    .update({ needs_reconnect: true, last_checked_at: new Date().toISOString() })
    .eq("user_id", userId);
}

/** 실제 API 호출 없이, DB에 저장된 최근 점검 결과만 빠르게 읽는다(모든 화면 상단 배너용). */
export async function getPersistedConnectionFlag(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<{ connected: boolean; needsReconnect: boolean }> {
  const { data } = await supabase
    .from("dm_accounts")
    .select("needs_reconnect")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return { connected: false, needsReconnect: false };
  return { connected: true, needsReconnect: data.needs_reconnect };
}

export interface InstagramConnectionStatus {
  connected: boolean;
  username: string | null;
  needsReconnect: boolean;
}

export async function getInstagramConnectionStatus(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<InstagramConnectionStatus> {
  const { data: account } = await supabase
    .from("dm_accounts")
    .select("access_token, token_expires_at, username")
    .eq("user_id", userId)
    .maybeSingle();
  if (!account) return { connected: false, username: null, needsReconnect: false };

  try {
    await getValidInstagramAccessToken(supabase, userId, account);
    return { connected: true, username: account.username, needsReconnect: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { connected: true, username: account.username, needsReconnect: message === "INSTAGRAM_RECONNECT_REQUIRED" };
  }
}
