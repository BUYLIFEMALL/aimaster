"use server";

import { YOUTUBE_REDIRECT_FOR, type CallbackMode } from "@/lib/oauthRedirect";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/apiKeys";
import { buildOAuthState } from "@/lib/oauthState";
import { getYoutubeAuthorizeUrl } from "@/lib/youtube/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { deleteSharedYoutubeAccount, getYtReplyAccount } from "@/lib/youtube/memberAccount";
import { ALL_YOUTUBE_SCOPES } from "@/lib/youtube/memberAccount";
import { getValidYoutubeAccessToken } from "@/lib/youtube/token";

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
  // 기본은 회원 앱에 예전부터 등록된 옛 콜백, [새 주소로 연결]을 누르면 새 콜백으로 인증한다(두 주소 동시 지원)
  const callbackMode: CallbackMode = formData.get("callback") === "new" ? "new" : "old";
  const withShared = formData.get("withShared") === "1";
  redirect(getYoutubeAuthorizeUrl(buildOAuthState(user.id, returnTo), clientId, YOUTUBE_REDIRECT_FOR(callbackMode), withShared ? { scopes: ALL_YOUTUBE_SCOPES, includeGranted: true } : {}));
}

export async function disconnectYoutubeAction() {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  await supabase.from("ytreply_accounts").delete().eq("user_id", user.id);
  // v1.14: 공용 연결 계정도 함께 해제(남겨 두면 해제해도 계속 연결된 상태로 보임)
  await deleteSharedYoutubeAccount(user.id);
  revalidatePath("/settings");
}



/** 실제 구글 API 호출 없이, DB에 저장된 최근 점검 결과만 빠르게 읽는다(모든 화면 상단 배너용). */
export async function getPersistedConnectionFlag(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<{ connected: boolean; needsReconnect: boolean }> {
  // v1.14: 공용 연결 계정(채널 관리 권한·같은 Google 앱) → 없으면 이 프로그램 표
  const data = await getYtReplyAccount(supabase, userId);
  if (!data) return { connected: false, needsReconnect: false };
  return { connected: true, needsReconnect: data.needs_reconnect };
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
  const account = await getYtReplyAccount(supabase, userId);
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
