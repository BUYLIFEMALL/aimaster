"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess, logProgramUsage } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/apiKeys";
import { requestSunoReplaceSection, toSunoVocalGender } from "@/lib/ai/suno";
import { checkReplaceRange, round2 } from "@/lib/replaceRange";

export interface ReplaceSectionState {
  error?: string;
  needsApiKey?: string; // "suno"
}

export interface ReplaceSectionInput {
  startS: number;
  endS: number;
  sectionLyrics: string; // 그 구간에서 새로 부를 가사(연주곡은 비워도 됨)
  fullLyrics: string; // 바뀐 구간을 넣은 곡 전체 가사(연주곡은 비워도 됨)
  personaId?: string | null; // music_personas.id(보컬곡만)
}

/**
 * 「✂️ 구간 다시 만들기」(2026-10-21 Suno V6 2차 ④) — 완성곡 한 구간만 새로 만들고 나머지는 원곡 그대로.
 * 곡 연장처럼 원곡 정보를 이어받은 새 트랙 행을 만들어 원곡을 보존하고(replaced_from_variant_id·구간 기록),
 * 결과는 곡 생성과 같은 콜백 형식이라 /api/webhooks/suno가 저장한다(커버는 원곡 것을 재사용 — lib/trackSync.ts).
 */
export async function replaceSectionAction(variantId: string, input: ReplaceSectionInput): Promise<ReplaceSectionState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: variant } = await supabase
    .from("music_track_variants")
    .select("id, track_id, suno_audio_id, duration_seconds")
    .eq("id", variantId)
    .eq("user_id", user.id)
    .single();
  if (!variant?.suno_audio_id) return { error: "이 곡은 Suno 오디오 ID가 없어서 구간을 다시 만들 수 없습니다." };

  const { data: original } = await supabase
    .from("music_tracks")
    .select("*")
    .eq("id", variant.track_id)
    .eq("user_id", user.id)
    .single();
  if (!original?.task_id) return { error: "원곡의 Suno 작업 ID가 없어서 구간을 다시 만들 수 없습니다." };

  const startS = round2(Number(input.startS));
  const endS = round2(Number(input.endS));
  const rangeError = checkReplaceRange(startS, endS, variant.duration_seconds);
  if (rangeError) return { error: rangeError };

  const isVocal = original.mode === "vocal";
  const sectionLyrics = input.sectionLyrics.trim();
  const fullLyrics = input.fullLyrics.trim();
  if (isVocal && !sectionLyrics) return { error: "이 구간에서 부를 가사를 입력해 주세요." };
  if (isVocal && !fullLyrics) return { error: "곡 전체 가사를 입력해 주세요(바뀐 구간 가사를 넣은 전체)." };

  let sunoPersonaId: string | undefined;
  if (isVocal && input.personaId) {
    const { data: persona } = await supabase
      .from("music_personas")
      .select("suno_persona_id")
      .eq("id", input.personaId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!persona) return { error: "선택한 페르소나를 찾을 수 없습니다. 화면을 새로고침해 주세요." };
    sunoPersonaId = persona.suno_persona_id;
  }

  const sunoKey = await resolveApiKey(supabase, user.id, "suno");
  if (!sunoKey) return { needsApiKey: "suno" };

  const { data: newTrack, error: insertError } = await supabase
    .from("music_tracks")
    .insert({
      planning_id: original.planning_id,
      user_id: user.id,
      mode: original.mode,
      title: original.title,
      prompt_text: isVocal ? fullLyrics : original.prompt_text,
      style_description: original.style_description,
      exclude_styles: original.exclude_styles,
      vocal_gender: original.vocal_gender,
      suno_model: original.suno_model,
      replaced_from_variant_id: variant.id,
      replace_start_s: startS,
      replace_end_s: endS,
      status: "generating",
    })
    .select("id")
    .single();
  if (insertError || !newTrack) return { error: insertError?.message ?? "구간 수정 트랙 저장에 실패했습니다." };

  try {
    const taskId = await requestSunoReplaceSection(
      {
        sourceTaskId: original.task_id,
        audioId: variant.suno_audio_id,
        title: original.title,
        tags: original.style_description ?? "",
        negativeTags: original.exclude_styles ?? undefined,
        // 연주곡은 가사 대신 원래 곡 설명을 넣고, 전체 가사는 연주곡 표시로 둔다.
        sectionLyrics: isVocal ? sectionLyrics : sectionLyrics || original.prompt_text,
        fullLyrics: isVocal ? fullLyrics : "[Instrumental]",
        startS,
        endS,
        vocalGender: isVocal ? toSunoVocalGender(original.vocal_gender) : undefined,
        personaId: sunoPersonaId,
      },
      sunoKey,
    );
    await supabase.from("music_tracks").update({ task_id: taskId }).eq("id", newTrack.id);
    await supabase.from("music_plannings").update({ status: "generating" }).eq("id", original.planning_id);
    await logProgramUsage({ userId: user.id, action: "replace_section", metadata: { variantId, startS, endS } });
    revalidatePath(`/plannings/${original.planning_id}`);
    return {};
  } catch (err) {
    const message = err instanceof Error ? err.message : "구간 다시 만들기 요청 중 오류가 발생했습니다.";
    await supabase.from("music_tracks").update({ status: "failed", error_message: message }).eq("id", newTrack.id);
    revalidatePath(`/plannings/${original.planning_id}`);
    return { error: message };
  }
}
