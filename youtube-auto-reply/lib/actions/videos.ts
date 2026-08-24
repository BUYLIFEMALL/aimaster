"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/apiKeys";
import { getValidYoutubeAccessToken } from "@/lib/actions/youtube";
import { getYoutubeChannelInfo, listUploadedVideos } from "@/lib/youtube/client";
import { normalizeUrl } from "@/lib/normalizeUrl";

export interface SyncVideosState {
  error?: string;
  syncedCount?: number;
}

/**
 * 채널의 업로드 영상 목록을 가져와 ytreply_videos에 upsert한다. 신규 영상은
 * is_monitored=true(기본 전체 모니터링)로 등록되고, 이미 있던 영상은 제목/썸네일만 갱신된다
 * (기존에 사용자가 꺼둔 is_monitored 값은 건드리지 않음).
 */
export async function syncVideosAction(): Promise<SyncVideosState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: account } = await supabase
    .from("ytreply_accounts")
    .select("access_token, refresh_token, token_expires_at, channel_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!account) return { error: "유튜브 채널이 연결되어 있지 않습니다." };

  const clientId = await resolveApiKey(supabase, user.id, "google_client_id");
  const clientSecret = await resolveApiKey(supabase, user.id, "google_client_secret");
  if (!clientId || !clientSecret) {
    return { error: "설정 페이지에서 Google OAuth Client ID/Secret을 먼저 등록해주세요." };
  }

  try {
    const accessToken = await getValidYoutubeAccessToken(supabase, user.id, account, clientId, clientSecret);

    // uploads playlist id를 별도로 저장해두지 않으므로(연결 시점엔 channel_id/title만 저장),
    // 동기화할 때마다 채널 정보를 다시 조회해서 업로드 재생목록 id를 얻는다.
    const channelInfo = await getYoutubeChannelInfo(accessToken);

    let syncedCount = 0;
    let pageToken: string | undefined;
    do {
      const { videos, nextPageToken } = await listUploadedVideos(accessToken, channelInfo.uploadsPlaylistId, user.id, pageToken);
      if (videos.length > 0) {
        const { error } = await supabase.from("ytreply_videos").upsert(
          videos.map((v) => ({
            user_id: user.id,
            youtube_video_id: v.videoId,
            title: v.title,
            thumbnail_url: v.thumbnailUrl,
            updated_at: new Date().toISOString(),
          })),
          { onConflict: "user_id,youtube_video_id", ignoreDuplicates: false },
        );
        if (error) return { error: error.message };
        syncedCount += videos.length;
      }
      pageToken = nextPageToken ?? undefined;
    } while (pageToken);

    // 이 수정 이전에 동기화되어 이미 저장돼있던 "Deleted video" 항목도 함께 정리한다.
    await supabase.from("ytreply_videos").delete().eq("user_id", user.id).eq("title", "Deleted video");

    revalidatePath("/videos");
    return { syncedCount };
  } catch (err) {
    const message = err instanceof Error ? err.message : "영상 동기화 중 오류가 발생했습니다.";
    if (message === "YOUTUBE_RECONNECT_REQUIRED") {
      return { error: "유튜브 채널 연결이 만료되었습니다. 설정 페이지에서 다시 연결해주세요." };
    }
    return { error: message };
  }
}

export async function toggleVideoMonitorAction(videoId: string, isMonitored: boolean) {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  await supabase
    .from("ytreply_videos")
    .update({ is_monitored: isMonitored })
    .eq("id", videoId)
    .eq("user_id", user.id);
  revalidatePath("/videos");
}

/** 목록에서 숨긴다(삭제는 아님 — 채널 재동기화 때 다시 나타나지 않도록 플래그만 켠다).
 * 숨기면서 모니터링도 함께 꺼서, 나중에 다시 보이게 해도 자동으로 켜져있지 않게 한다. */
export async function hideVideoAction(videoId: string) {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  await supabase
    .from("ytreply_videos")
    .update({ is_hidden: true, is_monitored: false })
    .eq("id", videoId)
    .eq("user_id", user.id);
  revalidatePath("/videos");
}

/** 체크박스로 선택한 여러 영상의 모니터링을 한 번에 켜거나 끈다. */
export async function bulkSetMonitorAction(videoIds: string[], isMonitored: boolean) {
  const user = await requireProgramAccess();
  if (videoIds.length === 0) return;
  const supabase = await createClient();
  await supabase
    .from("ytreply_videos")
    .update({ is_monitored: isMonitored })
    .eq("user_id", user.id)
    .in("id", videoIds);
  revalidatePath("/videos");
}

/** 체크박스로 선택한 여러 영상을 한 번에 숨긴다. */
export async function bulkHideAction(videoIds: string[]) {
  const user = await requireProgramAccess();
  if (videoIds.length === 0) return;
  const supabase = await createClient();
  await supabase
    .from("ytreply_videos")
    .update({ is_hidden: true, is_monitored: false })
    .eq("user_id", user.id)
    .in("id", videoIds);
  revalidatePath("/videos");
}

export async function unhideVideoAction(videoId: string) {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  await supabase
    .from("ytreply_videos")
    .update({ is_hidden: false })
    .eq("id", videoId)
    .eq("user_id", user.id);
  revalidatePath("/videos");
}

export interface SetVideoLinkState {
  error?: string;
}

export async function setVideoLinkAction(formData: FormData): Promise<SetVideoLinkState> {
  const user = await requireProgramAccess();
  const videoId = String(formData.get("videoId") ?? "");
  const link = normalizeUrl(String(formData.get("link") ?? ""));
  if (!videoId) return { error: "videoId가 없습니다." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("ytreply_videos")
    .update({ custom_link: link })
    .eq("id", videoId)
    .eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/videos");
  return {};
}
