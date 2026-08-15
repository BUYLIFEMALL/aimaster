"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess, logProgramUsage } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/apiKeys";
import { generateLyrics, generateInstrumentalPrompt, generateStyleAndExclude } from "@/lib/ai/musicPrompts";
import { requestSunoGeneration, checkSunoGenerationStatus, toSunoVocalGender, DEFAULT_SUNO_MODEL } from "@/lib/ai/suno";
import { saveSunoTrackResult, markTrackFailed } from "@/lib/trackSync";
import type { TrackMode, TrackStatus, VocalGender } from "@/types/database.types";

export interface GenerateTracksState {
  error?: string;
  needsApiKey?: string; // 어떤 provider가 없는지 ("openai" | "suno")
}

const MAX_GENERATE_COUNT = 10;

// 인스트루멘탈판은 보컬이 전혀 없어야 한다. Suno에 instrumental:true를 넘겨도, style/negativeTags에
// 보컬 관련 언급이 남아있으면(예: 기획 스타일이 "female vocals"를 담고 있는 경우) 결과에 보컬이
// 섞여 나올 수 있어서, style은 항상 vocalGender:null로 새로 만들고 negativeTags에도 보컬 배제
// 태그를 강제로 덧붙인다(이중 안전장치).
const INSTRUMENTAL_EXTRA_EXCLUDES = "vocals, singing, rap, spoken word, lyrics";

function withInstrumentalExcludes(excludeStyles: string): string {
  const already = excludeStyles.toLowerCase().includes("vocal");
  return already ? excludeStyles : `${excludeStyles}, ${INSTRUMENTAL_EXTRA_EXCLUDES}`;
}

/**
 * n8n(Make.com) 시나리오 01 뒷부분 + 시나리오 31(대량생성) 대응: 기획 1건에 대해 선택된
 * 모드(보컬/인스트루멘탈)마다 count(1~10)개의 트랙을 만들고 Suno 생성을 요청한다.
 * count가 2 이상이면 첫 번째는 기획의 스타일을 그대로 쓰고, 나머지는 GPT로 이미 쓴 스타일과
 * 겹치지 않는 새 변주를 만들어서 매번 다른 느낌의 곡이 나오게 한다(원본 블루프린트 31의
 * "반복마다 GPT로 다른 스타일을 순차 생성" 방식 — 대화 컨텍스트 유지 대신, 이번 배치에서
 * 이미 쓴 스타일 목록을 프롬프트에 함께 넘겨서 중복을 피한다).
 */
export interface GenerateTracksOptions {
  count?: number;
  vocalGender?: VocalGender | null;
  lang?: string;
  // 기획 단계에서 GPT가 만든 스타일 위에, 생성 직전에 사용자가 장르/무드 태그를 추가로 얹을 수
  // 있게 한다(선택). 지정하면 항상 새 스타일을 만들어서 반영한다 — 기획 자체는 건드리지 않는다.
  genre?: string[];
  mood?: string[];
}

export async function generateTracksAction(
  planningId: string,
  modes: TrackMode[],
  options: GenerateTracksOptions = {},
): Promise<GenerateTracksState> {
  const user = await requireProgramAccess();
  if (modes.length === 0) {
    return { error: "생성할 버전을 하나 이상 선택해주세요." };
  }
  const clampedCount = Math.min(Math.max(Math.round(options.count ?? 1) || 1, 1), MAX_GENERATE_COUNT);

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

  // 생성하기 패널에서 성별/언어를 기획 당시와 다르게 선택했으면, 기획에 저장된 값 대신 이번
  // 선택값으로 만든다(트랙마다 vocal_gender를 스냅샷해두는 것과 같은 이유 — 기획을 건드리지
  // 않고 "이번 생성만" 다르게 만들 수 있게 하기 위함).
  const effectiveVocalGender = options.vocalGender !== undefined ? options.vocalGender : planning.vocal_gender;
  const effectiveLang = options.lang?.trim() || planning.lang;
  const vocalGenderChanged = effectiveVocalGender !== (planning.vocal_gender ?? null);
  const genre = options.genre?.length ? options.genre : undefined;
  const mood = options.mood?.length ? options.mood : undefined;
  const hasTagOverride = Boolean(genre || mood);

  const openaiKey = await resolveApiKey(supabase, user.id, "openai");
  if (!openaiKey) return { needsApiKey: "openai" };
  const sunoKey = await resolveApiKey(supabase, user.id, "suno");
  if (!sunoKey) return { needsApiKey: "suno" };

  try {
    for (const mode of modes) {
      const usedStyles: string[] = [];
      // 인스트루멘탈판은 보컬 성별 개념이 없다 — 기획의 vocal_gender와 무관하게 항상 null.
      const modeVocalGender = mode === "vocal" ? effectiveVocalGender : null;
      const modeGenderChanged = mode === "vocal" && vocalGenderChanged;
      // 인스트루멘탈판은 기획의 스타일(보컬 묘사가 섞여 있을 수 있음)을 그대로 재사용하지 않고
      // 매번 보컬 없는 스타일을 새로 만든다. 장르/무드 태그를 추가했을 때도 마찬가지로 새 스타일이
      // 필요하다.
      const needsFreshStyle = mode === "instrumental" || modeGenderChanged || hasTagOverride;

      for (let i = 0; i < clampedCount; i++) {
        let styleDescription = planning.style_description;
        let excludeStyles = planning.exclude_styles;

        if (i > 0 || needsFreshStyle) {
          const styleResult = await generateStyleAndExclude(
            {
              songDescription: planning.song_description,
              vocalGender: modeVocalGender,
              avoidStyles: usedStyles.length > 0 ? usedStyles : undefined,
              genre,
              mood,
            },
            openaiKey,
          );
          styleDescription = styleResult.styleDescription;
          excludeStyles = styleResult.excludeStyles;
        }
        usedStyles.push(styleDescription);
        if (mode === "instrumental") {
          excludeStyles = withInstrumentalExcludes(excludeStyles);
        }

        const promptText =
          mode === "vocal"
            ? await generateLyrics(
                {
                  title: planning.title,
                  description: planning.description ?? "",
                  lang: effectiveLang,
                  styleDescription,
                  vocalGender: modeVocalGender,
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
            vocal_gender: mode === "vocal" ? modeVocalGender : null,
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
            vocalGender: toSunoVocalGender(modeVocalGender),
          },
          sunoKey,
        );

        await supabase.from("music_tracks").update({ task_id: taskId }).eq("id", track.id);
      }
    }

    await supabase.from("music_plannings").update({ status: "generating" }).eq("id", planningId);
    await logProgramUsage({
      userId: user.id,
      action: "generate_tracks",
      metadata: { planningId, modes, count: clampedCount, vocalGender: effectiveVocalGender, lang: effectiveLang, genre, mood },
    });

    revalidatePath(`/plannings/${planningId}`);
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "곡 생성 요청 중 오류가 발생했습니다." };
  }
}

export interface RegenerateMusicState {
  error?: string;
  needsApiKey?: string; // "openai" | "suno"
}

export interface RegenerateMusicOptions {
  lyrics: string;
  vocalGender: VocalGender | null;
  lang: string;
  count: number;
  // "생성하기" 패널과 동일한 장르/무드 태그 override(선택) — 지정하면 항상 새 가사/스타일을
  // 만든다(수정한 가사를 그대로 살리는 경로를 쓰지 않는다).
  genre?: string[];
  mood?: string[];
}

/**
 * "음악 재생성" — n8n(Make.com) 시나리오 03(가사수정)을 확장한 기능. 가사를 손으로 고쳐서
 * 그대로 다시 부르게 할 수도 있고, 성별/언어/곡수를 바꿔서 AI가 새로 작사·작곡하게 할 수도
 * 있다. 이력 보존을 위해 항상 새 music_tracks row를 만든다(원본 블루프린트는 in-place UPDATE).
 *
 * - 성별·언어를 트랙 생성 당시 값 그대로 두고 곡수도 1이면: textarea에 있는 가사를 그대로
 *   Suno에 보낸다(직접 수정한 가사를 그대로 살리는 경로).
 * - 셋 중 하나라도 바뀌면: textarea 내용은 참고하지 않고, 매 곡마다 GPT로 새 가사를 쓴다
 *   (성별이 바뀌면 스타일도 함께 새로 만들고, 곡수가 2 이상이면 generateTracksAction과 같은
 *   방식으로 이번 배치에서 이미 쓴 스타일과 겹치지 않게 만든다).
 */
export async function regenerateMusicAction(
  trackId: string,
  options: RegenerateMusicOptions,
): Promise<RegenerateMusicState> {
  const user = await requireProgramAccess();
  const trimmedLyrics = options.lyrics.trim();
  if (!trimmedLyrics) return { error: "가사를 입력해주세요." };
  const clampedCount = Math.min(Math.max(Math.round(options.count) || 1, 1), MAX_GENERATE_COUNT);

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
    return { error: "음악 재생성은 보컬판 트랙에서만 가능합니다." };
  }

  const { data: planning, error: planningError } = await supabase
    .from("music_plannings")
    .select("title, description, song_description, lang")
    .eq("id", original.planning_id)
    .single();
  if (planningError || !planning) {
    return { error: "기획을 찾을 수 없습니다." };
  }

  const genderChanged = (options.vocalGender ?? null) !== (original.vocal_gender ?? null);
  const langChanged = options.lang.trim() !== planning.lang;
  const genre = options.genre?.length ? options.genre : undefined;
  const mood = options.mood?.length ? options.mood : undefined;
  const hasTagOverride = Boolean(genre || mood);
  const needsFreshLyrics = genderChanged || langChanged || clampedCount > 1 || hasTagOverride;
  const needsFreshStyle = genderChanged || hasTagOverride;

  const sunoKey = await resolveApiKey(supabase, user.id, "suno");
  if (!sunoKey) return { needsApiKey: "suno" };
  const openaiKey = needsFreshLyrics ? await resolveApiKey(supabase, user.id, "openai") : null;
  if (needsFreshLyrics && !openaiKey) return { needsApiKey: "openai" };

  try {
    let styleDescription = original.style_description ?? "";
    let excludeStyles = original.exclude_styles ?? "";
    const usedStyles = [styleDescription];

    for (let i = 0; i < clampedCount; i++) {
      let promptText: string;

      if (i === 0 && !needsFreshLyrics) {
        // 성별/언어/곡수를 그대로 두고 가사만 손댄 경우 — 수정한 텍스트를 그대로 사용.
        promptText = trimmedLyrics;
      } else {
        if (needsFreshStyle) {
          const styleResult = await generateStyleAndExclude(
            {
              songDescription: planning.song_description,
              vocalGender: options.vocalGender,
              avoidStyles: i > 0 ? usedStyles : undefined,
              genre,
              mood,
            },
            openaiKey!,
          );
          styleDescription = styleResult.styleDescription;
          excludeStyles = styleResult.excludeStyles;
          usedStyles.push(styleDescription);
        }

        promptText = await generateLyrics(
          {
            title: original.title,
            description: planning.description ?? "",
            lang: options.lang,
            styleDescription,
            vocalGender: options.vocalGender,
          },
          openaiKey!,
        );
      }

      const { data: newTrack, error: insertError } = await supabase
        .from("music_tracks")
        .insert({
          planning_id: original.planning_id,
          user_id: user.id,
          mode: "vocal",
          title: original.title,
          prompt_text: promptText,
          style_description: styleDescription,
          exclude_styles: excludeStyles,
          vocal_gender: options.vocalGender,
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
          prompt: promptText,
          title: original.title,
          styleDescription,
          excludeStyles,
          instrumental: false,
          model: original.suno_model,
          vocalGender: toSunoVocalGender(options.vocalGender),
        },
        sunoKey,
      );

      await supabase.from("music_tracks").update({ task_id: taskId }).eq("id", newTrack.id);
    }

    await supabase.from("music_plannings").update({ status: "generating" }).eq("id", original.planning_id);
    await logProgramUsage({
      userId: user.id,
      action: "regenerate_music",
      metadata: { trackId, count: clampedCount, genderChanged, langChanged, genre, mood },
    });
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
