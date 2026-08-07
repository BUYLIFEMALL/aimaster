"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/apiKeys";
import { buildMovieJson, createMovie, checkRenderStatus } from "@/lib/ai/render";

export interface RequestRenderState {
  error?: string;
  success?: boolean;
}

/** 대사/이미지/BGM을 합쳐서 JSON2Video에 최종 영상 렌더링을 요청한다. */
export async function requestRenderAction(
  _prevState: RequestRenderState,
  formData: FormData,
): Promise<RequestRenderState> {
  const user = await requireUser();
  const videoId = String(formData.get("videoId") ?? "");
  const voiceId = String(formData.get("voiceId") ?? "").trim();
  if (!videoId) return { error: "videoId가 없습니다." };
  if (!voiceId) return { error: "ElevenLabs Voice ID를 입력해주세요." };

  const supabase = await createClient();

  const { data: video } = await supabase
    .from("shorts_videos")
    .select("id, title, bgm_selected_track_id")
    .eq("user_id", user.id)
    .eq("id", videoId)
    .single();
  if (!video) return { error: "영상을 찾을 수 없습니다." };

  const { data: segments } = await supabase
    .from("shorts_video_segments")
    .select("segment_index, narration, image_url")
    .eq("user_id", user.id)
    .eq("video_id", videoId)
    .order("segment_index", { ascending: true });
  if (!segments || segments.length === 0) return { error: "장면 정보가 없습니다." };
  const missingImages = segments.filter((s) => !s.image_url);
  if (missingImages.length > 0) {
    return { error: `장면 ${missingImages.map((s) => s.segment_index).join(", ")}에 이미지가 없습니다. 먼저 이미지를 생성해주세요.` };
  }

  // Connection ID는 선택 사항이다 (없으면 JSON2Video 자체 ElevenLabs 연동/크레딧으로 처리됨).
  const { data: renderSettings } = await supabase
    .from("user_render_settings")
    .select("elevenlabs_connection_id")
    .eq("user_id", user.id)
    .maybeSingle();

  let bgmAudioUrl: string | null = null;
  if (video.bgm_selected_track_id) {
    const { data: track } = await supabase
      .from("shorts_bgm_tracks")
      .select("audio_url")
      .eq("id", video.bgm_selected_track_id)
      .maybeSingle();
    bgmAudioUrl = track?.audio_url ?? null;
  }

  const movieJson = buildMovieJson({
    title: video.title,
    segments: segments.map((s) => ({ imageUrl: s.image_url!, narration: s.narration })),
    bgmAudioUrl,
    voiceId,
    connectionId: renderSettings?.elevenlabs_connection_id,
  });

  const j2vKey = await resolveApiKey(supabase, user.id, "json2video");

  let projectId: string;
  try {
    projectId = await createMovie(movieJson, j2vKey ?? "");
  } catch (err) {
    return { error: err instanceof Error ? err.message : "영상 렌더링 요청 중 오류가 발생했습니다." };
  }

  await supabase
    .from("shorts_videos")
    .update({ j2v_project_id: projectId, render_status: "rendering", rendered_video_url: null })
    .eq("id", videoId);

  revalidatePath(`/scripts/${videoId}`);
  return { success: true };
}

export interface CheckRenderState {
  error?: string;
  status?: "rendering" | "ready" | "failed";
}

/** JSON2Video 렌더링 상태를 폴링한다. 완료되면 영상 URL을 저장한다. */
export async function checkRenderStatusAction(
  _prevState: CheckRenderState,
  formData: FormData,
): Promise<CheckRenderState> {
  const user = await requireUser();
  const videoId = String(formData.get("videoId") ?? "");
  if (!videoId) return { error: "videoId가 없습니다." };

  const supabase = await createClient();
  const { data: video } = await supabase
    .from("shorts_videos")
    .select("id, j2v_project_id, render_status")
    .eq("user_id", user.id)
    .eq("id", videoId)
    .single();
  if (!video) return { error: "영상을 찾을 수 없습니다." };
  if (!video.j2v_project_id) return { error: "렌더링 요청 기록이 없습니다." };
  if (video.render_status !== "rendering") return { status: video.render_status ?? undefined };

  const j2vKey = await resolveApiKey(supabase, user.id, "json2video");

  try {
    const result = await checkRenderStatus(video.j2v_project_id, j2vKey ?? "");

    if (result.state === "processing") {
      return { status: "rendering" };
    }
    if (result.state === "failed") {
      await supabase.from("shorts_videos").update({ render_status: "failed" }).eq("id", videoId);
      revalidatePath(`/scripts/${videoId}`);
      return { status: "failed", error: result.error };
    }

    await supabase
      .from("shorts_videos")
      .update({ render_status: "ready", rendered_video_url: result.videoUrl })
      .eq("id", videoId);
    revalidatePath(`/scripts/${videoId}`);
    return { status: "ready" };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "상태 확인 중 오류가 발생했습니다." };
  }
}
