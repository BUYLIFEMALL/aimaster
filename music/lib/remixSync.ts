import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { SunoCallbackItem } from "@/lib/ai/suno";
import { persistSunoAssetToStorage } from "@/lib/trackSync";

// createAdminClient()(웹훅, 세션 없음)와 createClient()(로그인 사용자) 둘 다 이 타입을 만족한다.
type SupabaseLike = SupabaseClient<Database>;

export interface RemixForSync {
  id: string;
  user_id: string;
}

/**
 * Suno 리믹스(/generate/upload-cover) 완료 결과를 music_track_remix_variants로 저장한다.
 * saveSunoTrackResult()와 거의 같은 구조이지만 music_plannings가 없어 상태 전파(syncPlanningStatus)가
 * 필요 없고, 리믹스는 원곡 자체가 이미 사용자가 고른 커버 소스라 나노바나나 커스텀 앨범 커버는
 * 만들지 않는다(비용 절감 — Suno가 준 커버를 그대로 쓴다).
 */
export async function saveSunoRemixResult(
  supabase: SupabaseLike,
  remix: RemixForSync,
  items: SunoCallbackItem[],
): Promise<{ savedCount: number }> {
  const variants = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const sourceAudioUrl = item.audio_url || item.stream_audio_url;
    if (!sourceAudioUrl) continue;

    const audioUrl = await persistSunoAssetToStorage(
      supabase,
      `${remix.user_id}/remix/${remix.id}/${i}.mp3`,
      sourceAudioUrl,
      "audio/mpeg",
    );
    const imageUrl = item.image_url
      ? await persistSunoAssetToStorage(supabase, `${remix.user_id}/remix/${remix.id}/${i}.jpg`, item.image_url, "image/jpeg")
      : null;

    variants.push({
      remix_id: remix.id,
      user_id: remix.user_id,
      suno_audio_id: item.id ?? null,
      audio_url: audioUrl,
      image_url: imageUrl,
      duration_seconds: item.duration != null ? Math.round(item.duration) : null,
    });
  }

  if (variants.length === 0) return { savedCount: 0 };

  await supabase.from("music_track_remix_variants").insert(variants);
  await supabase.from("music_track_remixes").update({ status: "completed" }).eq("id", remix.id);

  return { savedCount: variants.length };
}

/** 리믹스를 실패로 표시한다. */
export async function markRemixFailed(supabase: SupabaseLike, remix: { id: string }, errorMessage: string) {
  await supabase.from("music_track_remixes").update({ status: "failed", error_message: errorMessage }).eq("id", remix.id);
}
