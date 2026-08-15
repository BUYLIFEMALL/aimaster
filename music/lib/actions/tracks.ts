"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess, logProgramUsage } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/apiKeys";
import { generateLyrics, generateInstrumentalPrompt, generateStyleAndExclude } from "@/lib/ai/musicPrompts";
import { requestSunoGeneration, checkSunoGenerationStatus, DEFAULT_SUNO_MODEL } from "@/lib/ai/suno";
import { saveSunoTrackResult, markTrackFailed } from "@/lib/trackSync";
import type { TrackMode, TrackStatus } from "@/types/database.types";

export interface GenerateTracksState {
  error?: string;
  needsApiKey?: string; // 어떤 provider가 없는지 ("openai" | "suno")
}

const MAX_GENERATE_COUNT = 10;

/**
 * n8n(Make.com) 시나리오 01 뒷부분 + 시나리오 31(대량생성) 대응: 기획 1건에 대해 선택된
 * 모드(보컬/인스트루멘탈)마다 count(1~10)개의 트랙을 만들고 Suno 생성을 요청한다.
 * count가 2 이상이면 첫 번째는 기획의 스타일을 그대로 쓰고, 나머지는 GPT로 이미 쓴 스타일과
 * 겹치지 않는 새 변주를 만들어서 매번 다른 느낌의 곡이 나오게 한다(원본 블루프린트 31의
 * "반복마다 GPT로 다른 스타일을 순차 생성" 방식 — 대화 컨텍스트 유지 대신, 이번 배치에서
 * 이미 쓴 스타일 목록을 프롬프트에 함께 넘겨서 중복을 피한다).
 */
export async function generateTracksAction(
  planningId: string,
  modes: TrackMode[],
  count: number = 1,
): Promise<GenerateTracksState> {
  const user = await requireProgramAccess();
  if (modes.length === 0) {
    return { error: "생성할 버전을 하나 이상 선택해주세요." };
  }
  const clampedCount = Math.min(Math.max(Math.round(count) || 1, 1), MAX_GENERATE_COUNT);

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
      const usedStyles: string[] = [];

      for (let i = 0; i < clampedCount; i++) {
        let styleDescription = planning.style_description;
        let excludeStyles = planning.exclude_styles;

        if (i > 0) {
          const styleResult = await generateStyleAndExclude(
            { songDescription: planning.song_description, vocalGender: planning.vocal_gender, avoidStyles: usedStyles },
            openaiKey,
          );
          styleDescription = styleResult.styleDescription;
          excludeStyles = styleResult.excludeStyles;
        }
        usedStyles.push(styleDescription);

        const promptText =
          mode === "vocal"
            ? await generateLyrics(
                {
                  title: planning.title,
                  description: planning.description ?? "",
                  lang: planning.lang,
                  styleDescription,
                  vocalGender: planning.vocal_gender,
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
            style_description: styleDescription,
            exclude_styles: excludeStyles,
            // 인스트루멘탈판은 보컬이 없으므로 성별을 남기지 않는다. music_plannings.vocal_gender는
            // 사용자가 나중에 수정할 수 있어서, 카드에 정확한 라벨("보컬버전(여성)" 등)을 보여주려면
            // 생성 당시 값을 트랙 자신에 스냅샷해야 한다(style_description과 동일한 이유).
            vocal_gender: mode === "vocal" ? planning.vocal_gender : null,
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
            styleDescription,
            excludeStyles,
            instrumental: mode === "instrumental",
          },
          sunoKey,
        );

        await supabase.from("music_tracks").update({ task_id: taskId }).eq("id", track.id);
      }
    }

    await supabase.from("music_plannings").update({ status: "generating" }).eq("id", planningId);
    await logProgramUsage({ userId: user.id, action: "generate_tracks", metadata: { planningId, modes, count: clampedCount } });

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
        vocal_gender: original.vocal_gender,
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

export interface SyncTrackStatusState {
  error?: string;
  status?: TrackStatus;
}

/**
 * Suno 웹훅이 도달하지 못한 경우(로컬 개발 환경에서는 항상 그렇고, 배포 환경에서도 드물게
 * 콜백이 유실될 수 있다)를 대비한 수동 동기화. record-info로 직접 조회해서 웹훅이 했어야 할
 * 저장 작업을 그대로 수행한다(lib/trackSync.ts를 웹훅 라우트와 공유).
 */
export async function syncTrackStatusAction(trackId: string): Promise<SyncTrackStatusState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: track, error: trackError } = await supabase
    .from("music_tracks")
    .select("id, user_id, planning_id, task_id, status, title, prompt_text, style_description")
    .eq("id", trackId)
    .eq("user_id", user.id)
    .single();
  if (trackError || !track) {
    return { error: "트랙을 찾을 수 없습니다." };
  }
  if (track.status !== "generating") {
    return { status: track.status };
  }
  if (!track.task_id) {
    return { error: "이 트랙은 아직 Suno에 생성 요청이 전달되지 않았습니다." };
  }

  const sunoKey = await resolveApiKey(supabase, user.id, "suno");
  if (!sunoKey) {
    return { error: "Suno API 키가 없습니다. 설정 페이지에서 본인 키를 등록해주세요." };
  }

  try {
    const result = await checkSunoGenerationStatus(track.task_id, sunoKey);

    if (result.state === "processing") {
      return { status: "generating" };
    }
    if (result.state === "failed") {
      await markTrackFailed(supabase, track, result.error);
      revalidatePath(`/plannings/${track.planning_id}`);
      return { status: "failed" };
    }

    const { savedCount } = await saveSunoTrackResult(supabase, track, result.tracks);
    if (savedCount === 0) {
      await markTrackFailed(supabase, track, "Suno가 오디오 URL을 반환하지 않았습니다.");
      revalidatePath(`/plannings/${track.planning_id}`);
      return { status: "failed" };
    }

    revalidatePath(`/plannings/${track.planning_id}`);
    return { status: "completed" };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "상태 확인 중 오류가 발생했습니다." };
  }
}
