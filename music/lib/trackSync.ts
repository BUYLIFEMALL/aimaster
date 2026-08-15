import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { SunoCallbackItem } from "@/lib/ai/suno";

// createAdminClient()(웹훅, 세션 없음)와 createClient()(로그인 사용자, 수동 동기화 버튼) 둘 다
// 이 타입을 만족하므로 두 경로가 저장 로직을 공유할 수 있다.
type SupabaseLike = SupabaseClient<Database>;

/** Suno의 임시 오디오/이미지 URL을 우리 Storage(music-audio)에 영구 저장한다. 실패하면 원본 URL 그대로 반환. */
export async function persistSunoAssetToStorage(
  supabase: SupabaseLike,
  path: string,
  sourceUrl: string,
  contentType: string,
): Promise<string> {
  try {
    const response = await fetch(sourceUrl);
    if (!response.ok) return sourceUrl;
    const buffer = Buffer.from(await response.arrayBuffer());

    const { error } = await supabase.storage.from("music-audio").upload(path, buffer, { contentType, upsert: true });
    if (error) return sourceUrl;

    const { data } = supabase.storage.from("music-audio").getPublicUrl(path);
    return data.publicUrl;
  } catch {
    return sourceUrl;
  }
}

/**
 * Suno 완료 결과(웹훅 콜백이든 record-info 수동 조회든)를 variant로 저장하고 트랙/기획 상태를
 * 갱신한다. app/api/webhooks/suno/route.ts와 lib/actions/tracks.ts의 syncTrackStatusAction이
 * 공유한다 — 두 경로가 각자 저장 로직을 따로 구현하면 나중에 한쪽만 고치는 드리프트가 생기기
 * 쉽기 때문에 반드시 이 함수 하나로 합친다.
 */
export async function saveSunoTrackResult(
  supabase: SupabaseLike,
  track: { id: string; user_id: string; planning_id: string },
  items: SunoCallbackItem[],
): Promise<{ savedCount: number }> {
  const variants = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const sourceAudioUrl = item.audio_url || item.stream_audio_url;
    if (!sourceAudioUrl) continue;

    const audioUrl = await persistSunoAssetToStorage(supabase, `${track.user_id}/${track.id}/${i}.mp3`, sourceAudioUrl, "audio/mpeg");
    const imageUrl = item.image_url
      ? await persistSunoAssetToStorage(supabase, `${track.user_id}/${track.id}/${i}.jpg`, item.image_url, "image/jpeg")
      : null;

    variants.push({
      track_id: track.id,
      user_id: track.user_id,
      suno_audio_id: item.id ?? null,
      audio_url: audioUrl,
      image_url: imageUrl,
      duration_seconds: item.duration != null ? Math.round(item.duration) : null,
    });
  }

  if (variants.length === 0) return { savedCount: 0 };

  await supabase.from("music_track_variants").insert(variants);
  await supabase.from("music_tracks").update({ status: "completed" }).eq("id", track.id);
  await syncPlanningStatus(supabase, track.planning_id);

  return { savedCount: variants.length };
}

/** 트랙을 실패로 표시하고, 기획에 속한 모든 트랙이 종결 상태가 됐으면 기획 상태도 함께 정리한다. */
export async function markTrackFailed(supabase: SupabaseLike, track: { id: string; planning_id: string }, errorMessage: string) {
  await supabase.from("music_tracks").update({ status: "failed", error_message: errorMessage }).eq("id", track.id);
  await syncPlanningStatus(supabase, track.planning_id);
}

/** 기획에 속한 모든 트랙이 종결 상태(completed/failed)가 되면 기획 상태도 함께 정리한다. */
export async function syncPlanningStatus(supabase: SupabaseLike, planningId: string) {
  const { data: tracks } = await supabase.from("music_tracks").select("status").eq("planning_id", planningId);
  if (!tracks || tracks.length === 0) return;

  const stillGenerating = tracks.some((t) => t.status === "generating");
  if (stillGenerating) return;

  const allFailed = tracks.every((t) => t.status === "failed");
  await supabase
    .from("music_plannings")
    .update({ status: allFailed ? "error" : "completed" })
    .eq("id", planningId);
}
