import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, VocalGender } from "@/types/database.types";
import { requestSunoExtend, toSunoVocalGender, type SunoCallbackItem } from "@/lib/ai/suno";
import { persistSunoAssetToStorage } from "@/lib/trackSync";

// createAdminClient()(웹훅, 세션 없음)와 createClient()(로그인 사용자) 둘 다 이 타입을 만족한다.
type SupabaseLike = SupabaseClient<Database>;

export interface RemixForSync {
  id: string;
  user_id: string;
  source_title: string | null;
  style_description: string | null;
  vocal_gender: VocalGender | null;
  suno_model: string;
  instrumental: boolean;
  target_duration_seconds: number | null;
  extend_hop_count: number;
}

// 리믹스 초기 생성이 원곡보다 훨씬 짧게(약 30~50초) 나오는 문제(2026-08-17, Suno "duration"
// 파라미터를 명시해도 완전히 해결되지 않음을 실사용 테스트로 확인)를 자동 보정하기 위해,
// 목표 길이(target_duration_seconds)의 90%에 못 미치면 Suno `/generate/extend`로 같은
// remix row를 최대 MAX_AUTO_EXTEND_HOPS번까지 자동으로 더 연장한다. 매번 새 remix row를
// 만들면(기존 곡 연장 패턴처럼) 짧은 중간 결과들이 목록에 계속 쌓여 지저분해지므로, 같은
// row의 task_id/status를 갱신해서 재사용한다 — 웹훅이 다시 이 row를 찾아 처리한다.
const MAX_AUTO_EXTEND_HOPS = 3;
const AUTO_EXTEND_TOLERANCE = 0.9;
const EXTEND_TAIL_MARGIN_SECONDS = 3;

/**
 * Suno 리믹스(/generate/upload-cover 또는 그 자동 연장분) 완료 결과를 music_track_remix_variants로
 * 저장한다. saveSunoTrackResult()와 거의 같은 구조이지만 music_plannings가 없어 상태 전파
 * (syncPlanningStatus)가 필요 없고, 나노바나나 커스텀 앨범 커버는 만들지 않는다(비용 절감 —
 * Suno가 준 커버를 그대로 쓴다). 저장 후 길이가 목표에 못 미치면 자동으로 연장을 이어간다.
 */
export async function saveSunoRemixResult(
  supabase: SupabaseLike,
  remix: RemixForSync,
  items: SunoCallbackItem[],
): Promise<{ savedCount: number; stillExtending: boolean }> {
  const hopPrefix = `h${remix.extend_hop_count}`;
  const variants = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const sourceAudioUrl = item.audio_url || item.stream_audio_url;
    if (!sourceAudioUrl) continue;

    const audioUrl = await persistSunoAssetToStorage(
      supabase,
      `${remix.user_id}/remix/${remix.id}/${hopPrefix}-${i}.mp3`,
      sourceAudioUrl,
      "audio/mpeg",
    );
    const imageUrl = item.image_url
      ? await persistSunoAssetToStorage(supabase, `${remix.user_id}/remix/${remix.id}/${hopPrefix}-${i}.jpg`, item.image_url, "image/jpeg")
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

  if (variants.length === 0) return { savedCount: 0, stillExtending: false };

  await supabase.from("music_track_remix_variants").insert(variants);

  const extending = await maybeAutoExtendRemix(supabase, remix, variants);
  if (!extending) {
    await supabase.from("music_track_remixes").update({ status: "completed" }).eq("id", remix.id);
  }

  return { savedCount: variants.length, stillExtending: extending };
}

/**
 * 방금 저장된 variant 중 가장 긴 것을 골라, 목표 길이에 못 미치고 아직 상한을 안 넘었으면
 * Suno `/generate/extend`로 자동 연장 요청을 보낸다. 요청에 성공하면 이 row의 task_id/status를
 * 새 연장 요청으로 갱신해서 그대로 "generating" 상태를 유지시킨다(다음 웹훅이 이어서 처리).
 * 반환값 true면 "아직 진행 중"이라는 뜻이라 호출부에서 status를 completed로 바꾸면 안 된다.
 */
async function maybeAutoExtendRemix(
  supabase: SupabaseLike,
  remix: RemixForSync,
  savedVariants: { suno_audio_id: string | null; duration_seconds: number | null }[],
): Promise<boolean> {
  if (!remix.target_duration_seconds) return false;
  if (remix.extend_hop_count >= MAX_AUTO_EXTEND_HOPS) return false;

  const longest = savedVariants.reduce((best, v) =>
    (v.duration_seconds ?? 0) > (best.duration_seconds ?? 0) ? v : best,
  );
  if (!longest.suno_audio_id || !longest.duration_seconds) return false;
  if (longest.duration_seconds >= remix.target_duration_seconds * AUTO_EXTEND_TOLERANCE) return false;

  const { data: keyRow } = await supabase
    .from("user_api_keys")
    .select("api_key")
    .eq("user_id", remix.user_id)
    .eq("provider", "suno")
    .maybeSingle();
  const sunoKey = keyRow?.api_key;
  if (!sunoKey) return false; // 본인 Suno 키가 사라진 경우 등 — 짧은 결과라도 완료 처리로 넘어간다.

  try {
    const continueAt = Math.max(1, longest.duration_seconds - EXTEND_TAIL_MARGIN_SECONDS);
    const taskId = await requestSunoExtend(
      {
        audioId: longest.suno_audio_id,
        continueAt,
        title: `${remix.source_title ?? "리믹스"} Remix`,
        styleDescription: remix.style_description ?? "",
        instrumental: remix.instrumental,
        prompt: remix.instrumental
          ? undefined
          : "Continue this remix naturally into a new section that fits the same style and mood as before.",
        vocalGender: toSunoVocalGender(remix.vocal_gender),
        model: remix.suno_model,
      },
      sunoKey,
    );

    await supabase
      .from("music_track_remixes")
      .update({ task_id: taskId, status: "generating", extend_hop_count: remix.extend_hop_count + 1 })
      .eq("id", remix.id);
    return true;
  } catch (err) {
    console.error("리믹스 자동 연장 요청 실패, 현재까지 결과로 완료 처리:", err);
    return false;
  }
}

/** 리믹스를 실패로 표시한다. */
export async function markRemixFailed(supabase: SupabaseLike, remix: { id: string }, errorMessage: string) {
  await supabase.from("music_track_remixes").update({ status: "failed", error_message: errorMessage }).eq("id", remix.id);
}
