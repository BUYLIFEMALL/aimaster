"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/apiKeys";
import { buildOAuthState } from "@/lib/oauthState";
import { getYoutubeAuthorizeUrl, refreshYoutubeAccessToken } from "@/lib/youtube/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export interface ConnectYoutubeState {
  error?: string;
}

export async function connectYoutubeAction(
  _prevState: ConnectYoutubeState,
  formData: FormData,
): Promise<ConnectYoutubeState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const clientId = await resolveApiKey(supabase, user.id, "google_client_id");
  if (!clientId) {
    return { error: "설정 페이지에서 Google OAuth Client ID를 먼저 등록해주세요." };
  }
  const returnTo = String(formData.get("returnTo") ?? "");
  redirect(getYoutubeAuthorizeUrl(buildOAuthState(user.id, returnTo), clientId));
}

export async function disconnectYoutubeAction() {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  await supabase.from("ytreply_accounts").delete().eq("user_id", user.id);
  revalidatePath("/settings");
}

/** access_token 만료 임박/만료 시 refresh_token으로 갱신하고 DB에 반영한다. */
export async function getValidYoutubeAccessToken(
  supabase: SupabaseClient<Database>,
  userId: string,
  account: { access_token: string; refresh_token: string; token_expires_at: string | null },
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const expiresAt = account.token_expires_at ? new Date(account.token_expires_at).getTime() : 0;
  const isExpiringSoon = expiresAt < Date.now() + 60_000;
  if (!isExpiringSoon) return account.access_token;

  try {
    const refreshed = await refreshYoutubeAccessToken(account.refresh_token, clientId, clientSecret);
    const tokenExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
    await supabase
      .from("ytreply_accounts")
      .update({ access_token: refreshed.access_token, token_expires_at: tokenExpiresAt })
      .eq("user_id", userId);
    return refreshed.access_token;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.startsWith("YOUTUBE_TOKEN_EXPIRED:")) {
      throw new Error("YOUTUBE_RECONNECT_REQUIRED");
    }
    throw err;
  }
}

export interface YoutubeConnectionStatus {
  connected: boolean;
  channelTitle: string | null;
  needsReconnect: boolean;
}

export async function getYoutubeConnectionStatus(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<YoutubeConnectionStatus> {
  const { data: account } = await supabase
    .from("ytreply_accounts")
    .select("access_token, refresh_token, token_expires_at, channel_title")
    .eq("user_id", userId)
    .maybeSingle();
  if (!account) return { connected: false, channelTitle: null, needsReconnect: false };

  const clientId = await resolveApiKey(supabase, userId, "google_client_id");
  const clientSecret = await resolveApiKey(supabase, userId, "google_client_secret");
  if (!clientId || !clientSecret) {
    return { connected: true, channelTitle: account.channel_title, needsReconnect: false };
  }

  try {
    await getValidYoutubeAccessToken(supabase, userId, account, clientId, clientSecret);
    return { connected: true, channelTitle: account.channel_title, needsReconnect: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { connected: true, channelTitle: account.channel_title, needsReconnect: message === "YOUTUBE_RECONNECT_REQUIRED" };
  }
}
