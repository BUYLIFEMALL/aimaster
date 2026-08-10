"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/apiKeys";
import { buildOAuthState } from "@/lib/oauthState";
import { suggestYoutubeCategory, generateYoutubeDescription } from "@/lib/ai/posting";
import {
  getYoutubeAuthorizeUrl,
  refreshYoutubeAccessToken,
  uploadYoutubeVideo,
} from "@/lib/youtube/client";
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
  // CSRF 방지 및 콜백에서 사용자를 식별하기 위한 state 값. 인증 후 원래 있던 페이지로
  // 돌아갈 수 있도록 returnTo 경로도 함께 실어 보낸다.
  const returnTo = String(formData.get("returnTo") ?? "");
  redirect(getYoutubeAuthorizeUrl(buildOAuthState(user.id, returnTo), clientId));
}

export async function disconnectYoutubeAction() {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  await supabase.from("youtube_accounts").delete().eq("user_id", user.id);
  revalidatePath("/scripts");
}

/** access_token 만료 임박/만료 시 refresh_token으로 갱신하고 DB에 반영한다. refresh_token 자체가 무효면 재연결이 필요하다는 에러를 던진다. */
async function getValidYoutubeAccessToken(
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
      .from("youtube_accounts")
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

/**
 * 페이지 진입 시 유튜브 연결 상태를 실제로 검증한다 (DB에 행이 있는지만 보지 않고,
 * refresh_token으로 access_token 갱신을 시도해 실제로 살아있는 연결인지 확인).
 * Google 앱이 "테스트" 상태면 refresh_token이 7일 후 만료되어 재연동이 필요해지는데,
 * 이 함수가 그 상태를 사용자가 업로드를 시도하기 전에 미리 감지해준다.
 */
export async function getYoutubeConnectionStatus(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<YoutubeConnectionStatus> {
  const { data: account } = await supabase
    .from("youtube_accounts")
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
    const needsReconnect = message === "YOUTUBE_RECONNECT_REQUIRED";
    return { connected: true, channelTitle: account.channel_title, needsReconnect };
  }
}

export interface SuggestCategoryState {
  error?: string;
  categoryId?: string;
}

/** 제목/스크립트로 AI가 유튜브 카테고리를 추천하고 저장한다 (사용자가 이후 직접 바꿀 수 있음). */
export async function suggestYoutubeCategoryAction(
  _prevState: SuggestCategoryState,
  formData: FormData,
): Promise<SuggestCategoryState> {
  const user = await requireProgramAccess();
  const videoId = String(formData.get("videoId") ?? "");
  if (!videoId) return { error: "videoId가 없습니다." };

  const supabase = await createClient();
  const { data: video } = await supabase
    .from("shorts_videos")
    .select("title, full_script")
    .eq("user_id", user.id)
    .eq("id", videoId)
    .single();
  if (!video) return { error: "영상을 찾을 수 없습니다." };

  const apiKey = await resolveApiKey(supabase, user.id, "openai");
  try {
    const categoryId = await suggestYoutubeCategory(video.title, video.full_script, apiKey ?? "");
    await supabase.from("shorts_videos").update({ youtube_category_id: categoryId }).eq("id", videoId);
    revalidatePath(`/scripts/${videoId}`);
    return { categoryId };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "카테고리 추천 중 오류가 발생했습니다." };
  }
}

export interface GenerateDescriptionState {
  error?: string;
  description?: string;
}

/** 제목/쇼츠 스토리로 유튜브 쇼츠 설명란용 텍스트를 생성해 저장한다. 게시 전 화면에서 수정할 수 있다. */
export async function generateYoutubeDescriptionAction(
  _prevState: GenerateDescriptionState,
  formData: FormData,
): Promise<GenerateDescriptionState> {
  const user = await requireProgramAccess();
  const videoId = String(formData.get("videoId") ?? "");
  if (!videoId) return { error: "videoId가 없습니다." };

  const supabase = await createClient();
  const { data: video } = await supabase
    .from("shorts_videos")
    .select("title, full_script")
    .eq("user_id", user.id)
    .eq("id", videoId)
    .single();
  if (!video) return { error: "영상을 찾을 수 없습니다." };

  const apiKey = await resolveApiKey(supabase, user.id, "openai");
  try {
    const description = await generateYoutubeDescription(video.title, video.full_script, apiKey ?? "");
    await supabase.from("shorts_videos").update({ youtube_description: description }).eq("id", videoId);
    revalidatePath(`/scripts/${videoId}`);
    return { description };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "설명 생성 중 오류가 발생했습니다." };
  }
}

export interface SaveDescriptionState {
  error?: string;
  success?: boolean;
}

/** 사용자가 직접 고친 유튜브 설명을 게시 없이 저장만 한다. */
export async function saveYoutubeDescriptionAction(
  _prevState: SaveDescriptionState,
  formData: FormData,
): Promise<SaveDescriptionState> {
  const user = await requireProgramAccess();
  const videoId = String(formData.get("videoId") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  if (!videoId) return { error: "videoId가 없습니다." };
  if (!description) return { error: "설명을 입력해주세요." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("shorts_videos")
    .update({ youtube_description: description })
    .eq("user_id", user.id)
    .eq("id", videoId);
  if (error) return { error: error.message };

  revalidatePath(`/scripts/${videoId}`);
  return { success: true };
}

export interface PostYoutubeState {
  error?: string;
  reconnectRequired?: boolean;
  success?: boolean;
}

/** 렌더링된 영상을 유튜브 쇼츠로 업로드한다. */
export async function postToYoutubeAction(
  _prevState: PostYoutubeState,
  formData: FormData,
): Promise<PostYoutubeState> {
  const user = await requireProgramAccess();
  const videoId = String(formData.get("videoId") ?? "");
  const categoryId = String(formData.get("categoryId") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!videoId) return { error: "videoId가 없습니다." };
  if (!categoryId) return { error: "카테고리를 선택해주세요." };
  if (!description) return { error: "설명을 먼저 생성하거나 입력해주세요." };

  const supabase = await createClient();

  const { data: video } = await supabase
    .from("shorts_videos")
    .select("id, title, rendered_video_url, render_status")
    .eq("user_id", user.id)
    .eq("id", videoId)
    .single();
  if (!video) return { error: "영상을 찾을 수 없습니다." };
  if (video.render_status !== "ready" || !video.rendered_video_url) {
    return { error: "먼저 영상 생성을 완료해주세요." };
  }

  const { data: account } = await supabase
    .from("youtube_accounts")
    .select("access_token, refresh_token, token_expires_at")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!account) return { error: "유튜브 채널이 연결되어 있지 않습니다." };

  const clientId = await resolveApiKey(supabase, user.id, "google_client_id");
  const clientSecret = await resolveApiKey(supabase, user.id, "google_client_secret");
  if (!clientId || !clientSecret) {
    return { error: "설정 페이지에서 Google OAuth Client ID/Secret을 먼저 등록해주세요." };
  }

  await supabase
    .from("shorts_videos")
    .update({ youtube_status: "posting", youtube_description: description })
    .eq("id", videoId);

  try {
    const accessToken = await getValidYoutubeAccessToken(supabase, user.id, account, clientId, clientSecret);

    const videoRes = await fetch(video.rendered_video_url);
    if (!videoRes.ok) throw new Error("렌더링된 영상 파일을 가져오지 못했습니다.");
    const videoBuffer = Buffer.from(await videoRes.arrayBuffer());

    const result = await uploadYoutubeVideo({
      accessToken,
      videoBuffer,
      title: video.title,
      description,
      categoryId,
      privacyStatus: "public",
    });

    await supabase
      .from("shorts_videos")
      .update({
        youtube_status: "posted",
        youtube_video_id: result.videoId,
        youtube_video_url: result.videoUrl,
        youtube_category_id: categoryId,
      })
      .eq("id", videoId);

    revalidatePath(`/scripts/${videoId}`);
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "유튜브 업로드 중 오류가 발생했습니다.";
    await supabase.from("shorts_videos").update({ youtube_status: "failed" }).eq("id", videoId);
    revalidatePath(`/scripts/${videoId}`);
    if (message === "YOUTUBE_RECONNECT_REQUIRED") {
      return { error: "유튜브 채널 연결이 만료되었습니다. 채널을 다시 연결해주세요.", reconnectRequired: true };
    }
    return { error: message };
  }
}
