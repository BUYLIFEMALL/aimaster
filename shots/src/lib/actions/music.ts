"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/apiKeys";
import { requestBackgroundMusic, checkMusicGenerationStatus } from "@/lib/ai/music";

export interface SaveBgmPromptState {
  error?: string;
  success?: boolean;
}

/** BGM 프롬프트/스타일/제외요소를 저장한다 (이미지 장면 편집과 동일한 패턴). */
export async function saveBgmPromptAction(
  _prevState: SaveBgmPromptState,
  formData: FormData,
): Promise<SaveBgmPromptState> {
  const user = await requireProgramAccess();
  const videoId = String(formData.get("videoId") ?? "");
  const bgmPrompt = String(formData.get("bgmPrompt") ?? "").trim();
  const bgmStyle = String(formData.get("bgmStyle") ?? "").trim();
  const bgmExclude = String(formData.get("bgmExclude") ?? "").trim();
  if (!videoId || !bgmPrompt || !bgmStyle) {
    return { error: "BGM 프롬프트와 스타일을 입력해주세요." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("shorts_videos")
    .update({ bgm_prompt: bgmPrompt, bgm_style: bgmStyle, bgm_exclude: bgmExclude || null })
    .eq("user_id", user.id)
    .eq("id", videoId);
  if (error) return { error: error.message };

  revalidatePath(`/scripts/${videoId}`);
  return { success: true };
}

export interface RequestBgmState {
  error?: string;
  success?: boolean;
}

/**
 * BGM 프롬프트/스타일/제외요소로 Suno에 음악 생성을 요청한다. 화면에서 수정만 하고 저장을
 * 누르지 않았어도, 폼에 실려온 최신 값을 먼저 저장한 다음 그 내용으로 요청한다.
 */
export async function requestBgmGenerationAction(
  _prevState: RequestBgmState,
  formData: FormData,
): Promise<RequestBgmState> {
  const user = await requireProgramAccess();
  const videoId = String(formData.get("videoId") ?? "");
  const bgmPrompt = String(formData.get("bgmPrompt") ?? "").trim();
  const bgmStyle = String(formData.get("bgmStyle") ?? "").trim();
  const bgmExclude = String(formData.get("bgmExclude") ?? "").trim();
  if (!videoId) return { error: "videoId가 없습니다." };

  const supabase = await createClient();

  if (bgmPrompt && bgmStyle) {
    const { error: saveError } = await supabase
      .from("shorts_videos")
      .update({ bgm_prompt: bgmPrompt, bgm_style: bgmStyle, bgm_exclude: bgmExclude || null })
      .eq("user_id", user.id)
      .eq("id", videoId);
    if (saveError) return { error: saveError.message };
  }

  const { data: video } = await supabase
    .from("shorts_videos")
    .select("id, title, bgm_prompt, bgm_style, bgm_exclude")
    .eq("user_id", user.id)
    .eq("id", videoId)
    .single();
  if (!video) return { error: "영상을 찾을 수 없습니다." };
  if (!video.bgm_prompt || !video.bgm_style) {
    return { error: "BGM 프롬프트가 없습니다. 스크립트를 다시 생성해주세요." };
  }

  const sunoKey = await resolveApiKey(supabase, user.id, "suno");

  let taskId: string;
  try {
    taskId = await requestBackgroundMusic(
      {
        title: video.title,
        bgmPrompt: video.bgm_prompt,
        style: video.bgm_style,
        negativeTags: video.bgm_exclude ?? "vocals, singing, lyrics",
      },
      sunoKey ?? "",
    );
  } catch (err) {
    return { error: err instanceof Error ? err.message : "음악 생성 요청 중 오류가 발생했습니다." };
  }

  await supabase
    .from("shorts_videos")
    .update({ suno_task_id: taskId, bgm_status: "processing" })
    .eq("id", videoId);

  revalidatePath(`/scripts/${videoId}`);
  revalidatePath("/music");
  return { success: true };
}

/**
 * Suno가 준 오디오 URL(임시 파일일 수 있음)을 다운로드해서 우리 Storage에 영구 저장하고
 * 그 공개 URL을 반환한다. 다운로드에 실패하면 Suno 원본 URL을 그대로 폴백으로 쓴다
 * (트랙 저장 자체가 실패해서 사라지는 것보다는 낫다).
 */
async function persistBgmAudio(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  videoId: string,
  sourceUrl: string,
): Promise<string> {
  try {
    const response = await fetch(sourceUrl);
    if (!response.ok) return sourceUrl;
    const buffer = Buffer.from(await response.arrayBuffer());
    const path = `${userId}/${videoId}-${crypto.randomUUID()}.mp3`;

    const { error: uploadError } = await supabase.storage
      .from("shots-bgm")
      .upload(path, buffer, { contentType: "audio/mpeg", upsert: false });
    if (uploadError) return sourceUrl;

    const { data: publicUrlData } = supabase.storage.from("shots-bgm").getPublicUrl(path);
    return publicUrlData.publicUrl;
  } catch {
    return sourceUrl;
  }
}

export interface CheckBgmState {
  error?: string;
  status?: "processing" | "ready" | "failed";
}

/** Suno 생성 상태를 폴링한다. 완료되면 트랙들을 저장하고, 아직이면 상태를 유지한다. */
export async function checkBgmStatusAction(
  _prevState: CheckBgmState,
  formData: FormData,
): Promise<CheckBgmState> {
  const user = await requireProgramAccess();
  const videoId = String(formData.get("videoId") ?? "");
  if (!videoId) return { error: "videoId가 없습니다." };

  const supabase = await createClient();
  const { data: video } = await supabase
    .from("shorts_videos")
    .select("id, suno_task_id, bgm_status")
    .eq("user_id", user.id)
    .eq("id", videoId)
    .single();
  if (!video) return { error: "영상을 찾을 수 없습니다." };
  if (!video.suno_task_id) return { error: "생성 요청 기록이 없습니다." };
  if (video.bgm_status !== "processing") return { status: video.bgm_status ?? undefined };

  const sunoKey = await resolveApiKey(supabase, user.id, "suno");

  try {
    const result = await checkMusicGenerationStatus(video.suno_task_id, sunoKey ?? "");

    if (result.state === "processing") {
      return { status: "processing" };
    }

    if (result.state === "failed") {
      await supabase.from("shorts_videos").update({ bgm_status: "failed" }).eq("id", videoId);
      revalidatePath(`/scripts/${videoId}`);
      return { status: "failed", error: result.error };
    }

    // ready: 오디오 파일을 우리 Storage에 영구 저장한 다음 트랙들을 저장하고,
    // 첫 번째 트랙을 기본 선택으로 지정한다.
    const tracksWithStorageUrl = await Promise.all(
      result.tracks.map(async (t) => ({
        video_id: videoId,
        user_id: user.id,
        audio_url: await persistBgmAudio(supabase, user.id, videoId, t.audioUrl),
        image_url: t.imageUrl,
        title: t.title,
        // Suno는 재생시간을 소수(예: 181.8)로 주는데 DB 컬럼은 정수라 반올림해서 저장한다.
        duration_seconds: t.durationSeconds != null ? Math.round(t.durationSeconds) : null,
      })),
    );

    const { data: insertedTracks, error: insertError } = await supabase
      .from("shorts_bgm_tracks")
      .insert(tracksWithStorageUrl)
      .select("id");
    if (insertError) return { error: insertError.message };

    await supabase
      .from("shorts_videos")
      .update({ bgm_status: "ready", bgm_selected_track_id: insertedTracks?.[0]?.id ?? null })
      .eq("id", videoId);

    revalidatePath(`/scripts/${videoId}`);
    revalidatePath("/music");
    return { status: "ready" };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "상태 확인 중 오류가 발생했습니다." };
  }
}

export interface SelectBgmTrackState {
  error?: string;
  success?: boolean;
}

/** 생성된 트랙 중 하나를 최종 사용할 BGM으로 선택한다 (최종 영상 렌더링에 사용됨). */
export async function selectBgmTrackAction(
  _prevState: SelectBgmTrackState,
  formData: FormData,
): Promise<SelectBgmTrackState> {
  const user = await requireProgramAccess();
  const videoId = String(formData.get("videoId") ?? "");
  const trackId = String(formData.get("trackId") ?? "");
  if (!videoId || !trackId) return { error: "선택할 트랙이 없습니다." };

  const supabase = await createClient();
  const { data: track } = await supabase
    .from("shorts_bgm_tracks")
    .select("id")
    .eq("user_id", user.id)
    .eq("id", trackId)
    .eq("video_id", videoId)
    .maybeSingle();
  if (!track) return { error: "이 영상에서 생성된 트랙이 아닙니다." };

  const { error } = await supabase
    .from("shorts_videos")
    .update({ bgm_selected_track_id: trackId })
    .eq("user_id", user.id)
    .eq("id", videoId);
  if (error) return { error: error.message };

  revalidatePath(`/scripts/${videoId}`);
  return { success: true };
}

export interface DeleteBgmTrackState {
  error?: string;
  success?: boolean;
}

/** 우리 Storage(shots-bgm) 공개 URL에서 버킷 내부 경로만 뽑아낸다. 우리 버킷 URL이 아니면 null. */
function extractShotsBgmStoragePath(url: string): string | null {
  const marker = "/storage/v1/object/public/shots-bgm/";
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marker.length));
}

/** 필요 없는 트랙을 삭제한다. 우리 Storage에 저장된 파일이면 스토리지에서도 함께 삭제한다. */
export async function deleteBgmTrackAction(
  _prevState: DeleteBgmTrackState,
  formData: FormData,
): Promise<DeleteBgmTrackState> {
  const user = await requireProgramAccess();
  const videoId = String(formData.get("videoId") ?? "");
  const trackId = String(formData.get("trackId") ?? "");
  if (!videoId || !trackId) return { error: "삭제할 트랙이 없습니다." };

  const supabase = await createClient();
  const { data: track } = await supabase
    .from("shorts_bgm_tracks")
    .select("id, audio_url")
    .eq("user_id", user.id)
    .eq("id", trackId)
    .eq("video_id", videoId)
    .maybeSingle();
  if (!track) return { error: "이 영상에서 생성된 트랙이 아닙니다." };

  const storagePath = extractShotsBgmStoragePath(track.audio_url);
  if (storagePath) {
    await supabase.storage.from("shots-bgm").remove([storagePath]);
  }

  const { error: deleteError } = await supabase.from("shorts_bgm_tracks").delete().eq("id", trackId);
  if (deleteError) return { error: deleteError.message };

  // 방금 삭제한 트랙이 선택돼 있었다면, 남은 트랙 중 하나로 선택을 옮기거나 비운다.
  const { data: video } = await supabase
    .from("shorts_videos")
    .select("bgm_selected_track_id")
    .eq("id", videoId)
    .single();
  if (video?.bgm_selected_track_id === trackId) {
    const { data: remaining } = await supabase
      .from("shorts_bgm_tracks")
      .select("id")
      .eq("video_id", videoId)
      .limit(1)
      .maybeSingle();
    await supabase
      .from("shorts_videos")
      .update({ bgm_selected_track_id: remaining?.id ?? null })
      .eq("id", videoId);
  }

  revalidatePath(`/scripts/${videoId}`);
  revalidatePath("/music");
  return { success: true };
}
