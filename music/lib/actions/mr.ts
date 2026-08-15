"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess, logProgramUsage } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/apiKeys";
import { requestSunoVocalRemoval } from "@/lib/ai/suno";

export interface CreateMrState {
  error?: string;
  needsApiKey?: string; // "suno"
}

/**
 * "MR(보컬제거) 만들기" — 완성된 특정 variant(오디오)에서 보컬을 제거한 반주(MR) 버전을
 * 만든다. 결과는 music_track_mr에 별도로 쌓인다(가사/스타일과 무관한 순수 후처리라
 * music_tracks 이력에 새 트랙을 추가하지 않는다). 완료 여부를 조회하는 폴링 API가
 * Suno 문서에 없어서(웹훅 전용) 로컬 개발 환경에서는 결과를 확인할 수 없다 — 배포
 * 환경에서만 실제로 완료 처리된다.
 */
export async function createMrAction(variantId: string): Promise<CreateMrState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: variant, error: variantError } = await supabase
    .from("music_track_variants")
    .select("id, track_id, suno_audio_id")
    .eq("id", variantId)
    .eq("user_id", user.id)
    .single();
  if (variantError || !variant) {
    return { error: "곡을 찾을 수 없습니다." };
  }
  if (!variant.suno_audio_id) {
    return { error: "이 곡은 Suno 오디오 ID가 없어서 MR을 만들 수 없습니다." };
  }

  const sunoKey = await resolveApiKey(supabase, user.id, "suno");
  if (!sunoKey) return { needsApiKey: "suno" };

  try {
    const { data: mr, error: insertError } = await supabase
      .from("music_track_mr")
      .insert({ variant_id: variant.id, user_id: user.id, status: "generating" })
      .select("id")
      .single();
    if (insertError || !mr) {
      return { error: insertError?.message ?? "MR 요청 저장에 실패했습니다." };
    }

    const taskId = await requestSunoVocalRemoval({ audioId: variant.suno_audio_id }, sunoKey);
    await supabase.from("music_track_mr").update({ task_id: taskId }).eq("id", mr.id);

    const { data: track } = await supabase
      .from("music_tracks")
      .select("planning_id")
      .eq("id", variant.track_id)
      .single();

    await logProgramUsage({ userId: user.id, action: "create_mr", metadata: { variantId } });
    if (track) revalidatePath(`/plannings/${track.planning_id}`);
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "MR 생성 요청 중 오류가 발생했습니다." };
  }
}
