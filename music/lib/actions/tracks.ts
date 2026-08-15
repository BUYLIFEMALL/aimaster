"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess, logProgramUsage } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/apiKeys";
import { generateLyrics, generateInstrumentalPrompt } from "@/lib/ai/musicPrompts";
import { requestSunoGeneration, DEFAULT_SUNO_MODEL } from "@/lib/ai/suno";
import type { TrackMode } from "@/types/database.types";

export interface GenerateTracksState {
  error?: string;
  needsApiKey?: string; // 어떤 provider가 없는지 ("openai" | "suno")
}

/**
 * n8n(Make.com) 시나리오 01 뒷부분 대응: 기획 1건에 대해 선택된 모드(보컬/인스트루멘탈)마다
 * 트랙을 하나씩 만들고 Suno 생성을 요청한다. 블루프린트 원본은 필터 없는 라우터라 두 모드를
 * 항상 병렬로 만들었지만, 여기서는 사용자가 화면에서 체크박스로 고른 모드만 생성한다.
 */
export async function generateTracksAction(
  planningId: string,
  modes: TrackMode[],
): Promise<GenerateTracksState> {
  const user = await requireProgramAccess();
  if (modes.length === 0) {
    return { error: "생성할 버전을 하나 이상 선택해주세요." };
  }

  const supabase = await createClient();

  const { data: planning, error: planningError } = await supabase
    .from("music_plannings")
    .select("*")
    .eq("id", planningId)
    .eq("user_id", user.id)
    .single();
  if (planningError || !planning) {
    return { error: "기획을 찾을 수 없습니다." };
  }
  if (!planning.title || !planning.style_description || !planning.exclude_styles) {
    return { error: "기획이 아직 완료되지 않았습니다(스타일/제목 생성 실패). 기획을 다시 시도해주세요." };
  }

  const openaiKey = await resolveApiKey(supabase, user.id, "openai");
  if (!openaiKey) return { needsApiKey: "openai" };
  const sunoKey = await resolveApiKey(supabase, user.id, "suno");
  if (!sunoKey) return { needsApiKey: "suno" };

  try {
    for (const mode of modes) {
      const promptText =
        mode === "vocal"
          ? await generateLyrics(
              {
                title: planning.title,
                description: planning.description ?? "",
                lang: planning.lang,
                styleDescription: planning.style_description,
              },
              openaiKey,
            )
          : await generateInstrumentalPrompt(
              { title: planning.title, description: planning.description ?? "" },
              openaiKey,
            );

      const { data: track, error: trackError } = await supabase
        .from("music_tracks")
        .insert({
          planning_id: planningId,
          user_id: user.id,
          mode,
          title: planning.title,
          prompt_text: promptText,
          style_description: planning.style_description,
          exclude_styles: planning.exclude_styles,
          suno_model: DEFAULT_SUNO_MODEL,
          status: "generating",
        })
        .select("id")
        .single();
      if (trackError || !track) {
        return { error: trackError?.message ?? "트랙 생성에 실패했습니다." };
      }

      const taskId = await requestSunoGeneration(
        {
          prompt: promptText,
          title: planning.title,
          styleDescription: planning.style_description,
          excludeStyles: planning.exclude_styles,
          instrumental: mode === "instrumental",
        },
        sunoKey,
      );

      await supabase.from("music_tracks").update({ task_id: taskId }).eq("id", track.id);
    }

    await supabase.from("music_plannings").update({ status: "generating" }).eq("id", planningId);
    await logProgramUsage({ userId: user.id, action: "generate_tracks", metadata: { planningId, modes } });

    revalidatePath(`/plannings/${planningId}`);
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "곡 생성 요청 중 오류가 발생했습니다." };
  }
}

export interface RegenerateTrackState {
  error?: string;
  needsApiKey?: boolean;
}

/**
 * n8n(Make.com) 시나리오 03 대응: 가사를 수정해서 다시 Suno 생성을 요청한다.
 * 기존 트랙의 style/title/mode는 그대로 재사용하되, 이력 보존을 위해 새 music_tracks row를
 * 만든다(shots/shop-detail-page의 재생성 이력 패턴과 동일 — 블루프린트 원본은 in-place UPDATE).
 */
export async function regenerateTrackAction(
  trackId: string,
  newLyrics: string,
): Promise<RegenerateTrackState> {
  const user = await requireProgramAccess();
  const trimmed = newLyrics.trim();
  if (!trimmed) return { error: "가사를 입력해주세요." };

  const supabase = await createClient();
  const { data: original, error: originalError } = await supabase
    .from("music_tracks")
    .select("*")
    .eq("id", trackId)
    .eq("user_id", user.id)
    .single();
  if (originalError || !original) {
    return { error: "트랙을 찾을 수 없습니다." };
  }
  if (original.mode !== "vocal") {
    return { error: "가사 수정 재생성은 보컬판 트랙에서만 가능합니다." };
  }

  const sunoKey = await resolveApiKey(supabase, user.id, "suno");
  if (!sunoKey) return { needsApiKey: true };

  try {
    const { data: newTrack, error: insertError } = await supabase
      .from("music_tracks")
      .insert({
        planning_id: original.planning_id,
        user_id: user.id,
        mode: original.mode,
        title: original.title,
        prompt_text: trimmed,
        style_description: original.style_description,
        exclude_styles: original.exclude_styles,
        suno_model: original.suno_model,
        status: "generating",
      })
      .select("id")
      .single();
    if (insertError || !newTrack) {
      return { error: insertError?.message ?? "재생성 트랙 저장에 실패했습니다." };
    }

    const taskId = await requestSunoGeneration(
      {
        prompt: trimmed,
        title: original.title,
        styleDescription: original.style_description ?? "",
        excludeStyles: original.exclude_styles ?? "",
        instrumental: false,
        model: original.suno_model,
      },
      sunoKey,
    );

    await supabase.from("music_tracks").update({ task_id: taskId }).eq("id", newTrack.id);
    await supabase.from("music_plannings").update({ status: "generating" }).eq("id", original.planning_id);

    await logProgramUsage({ userId: user.id, action: "regenerate_track", metadata: { trackId } });
    revalidatePath(`/plannings/${original.planning_id}`);
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "재생성 요청 중 오류가 발생했습니다." };
  }
}
