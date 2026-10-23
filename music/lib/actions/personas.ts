"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess, logProgramUsage } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/apiKeys";
import { requestSunoPersona } from "@/lib/ai/suno";

export interface PersonaState {
  error?: string;
  needsApiKey?: string; // "suno"
  personaId?: string;
}

export interface PersonaOption {
  id: string;
  name: string;
  description: string;
  source_title: string | null;
}

/** 내 페르소나 목록(최근 순). 생성 패널·정밀 기획의 선택 칸에 쓴다. */
export async function listPersonasAction(): Promise<PersonaOption[]> {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const { data } = await supabase
    .from("music_personas")
    .select("id, name, description, source_title")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []) as PersonaOption[];
}

/**
 * 「🧑‍🎤 이 목소리 저장」 — 완성된 보컬 곡(variant)의 목소리·스타일을 Suno 페르소나로 만들고 music_personas에 저장한다.
 * (2026-10-21 V6 2차 ③, sunoapi.org /generate/generate-persona — 콜백 없이 즉시 personaId, 곡 하나당 한 번만)
 */
export async function createPersonaAction(
  variantId: string,
  input: { name: string; description: string; vocalStart?: number; vocalEnd?: number },
): Promise<PersonaState> {
  const user = await requireProgramAccess();
  const name = input.name.trim();
  const description = input.description.trim();
  if (!name) return { error: "페르소나 이름을 입력해 주세요." };
  if (!description) return { error: "목소리·스타일 설명을 입력해 주세요(예: 따뜻하고 허스키한 여성 보컬, 어쿠스틱 발라드)." };

  let vocalStart: number | undefined;
  let vocalEnd: number | undefined;
  if (input.vocalStart != null && input.vocalEnd != null) {
    vocalStart = Math.max(0, Math.round(input.vocalStart));
    vocalEnd = Math.round(input.vocalEnd);
    const span = vocalEnd - vocalStart;
    if (span < 10 || span > 30) return { error: "목소리 구간은 10~30초 길이로 지정해 주세요." };
  }

  const supabase = await createClient();
  const { data: variant } = await supabase
    .from("music_track_variants")
    .select("id, track_id, suno_audio_id, duration_seconds")
    .eq("id", variantId)
    .eq("user_id", user.id)
    .single();
  if (!variant?.suno_audio_id) return { error: "이 곡은 Suno 오디오 ID가 없어서 페르소나를 만들 수 없습니다." };
  if (vocalEnd != null && variant.duration_seconds && vocalEnd > variant.duration_seconds) {
    return { error: `목소리 구간 끝이 곡 길이(${Math.floor(variant.duration_seconds)}초)를 넘습니다.` };
  }

  const { data: track } = await supabase
    .from("music_tracks")
    .select("planning_id, task_id, mode, style_description")
    .eq("id", variant.track_id)
    .single();
  if (!track?.task_id) return { error: "원곡의 Suno 작업 ID가 없어서 페르소나를 만들 수 없습니다." };
  if (track.mode !== "vocal") return { error: "보컬이 있는 곡으로만 페르소나를 만들 수 있습니다." };

  const sunoKey = await resolveApiKey(supabase, user.id, "suno");
  if (!sunoKey) return { needsApiKey: "suno" };

  const { data: planning } = await supabase
    .from("music_plannings")
    .select("title")
    .eq("id", track.planning_id)
    .single();

  try {
    const sunoPersonaId = await requestSunoPersona(
      {
        sourceTaskId: track.task_id,
        audioId: variant.suno_audio_id,
        name,
        description,
        style: track.style_description ?? undefined,
        vocalStart,
        vocalEnd,
      },
      sunoKey,
    );
    const { data: row, error } = await supabase
      .from("music_personas")
      .insert({
        user_id: user.id,
        suno_persona_id: sunoPersonaId,
        name: name.slice(0, 80),
        description: description.slice(0, 1000),
        style: track.style_description ?? null,
        source_variant_id: variant.id,
        source_title: planning?.title ?? null,
      })
      .select("id")
      .single();
    if (error || !row) return { error: error?.message ?? "페르소나 저장에 실패했습니다." };
    await logProgramUsage({ userId: user.id, action: "create_persona", metadata: { variantId } });
    revalidatePath(`/plannings/${track.planning_id}`);
    return { personaId: row.id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "페르소나 생성 중 오류가 발생했습니다." };
  }
}

/** 내 목록에서만 지운다(Suno 쪽 페르소나는 sunoapi.org에 삭제 API가 없어 남는다). */
export async function deletePersonaAction(personaId: string): Promise<PersonaState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const { error } = await supabase.from("music_personas").delete().eq("id", personaId).eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/plannings");
  return {};
}
