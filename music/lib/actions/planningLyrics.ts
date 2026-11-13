"use server";

// v1.51 (2026-11-13 주인님 지시): 빠른 기획 상세에서 가사를 미리 만들고 고쳐 저장한 뒤 곡을 만든다.
// 저장한 가사(music_plannings.lyrics)가 있으면 보컬판 생성 때 GPT 작사를 건너뛰고 그대로 Suno로 보낸다(lib/actions/tracks.ts).
import { revalidatePath } from "next/cache";
import { requireProgramAccess, logProgramUsage } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/apiKeys";
import { generateLyrics } from "@/lib/ai/musicPrompts";
import { VOCAL_GENDER_OPTIONS } from "@/lib/constants";
import type { VocalGender } from "@/types/database.types";

const LYRICS_MAX = 5000;

export interface PlanningLyricsState {
  error?: string;
  needsApiKey?: string;
  lyrics?: string;
}

/** AI로 가사를 만들어 바로 저장한다(회원 본인 OpenAI 키, gpt-4o-mini 1회, 재시도 없음). */
export async function generatePlanningLyricsAction(
  planningId: string,
  options: { vocalGender?: string | null; lang?: string } = {},
): Promise<PlanningLyricsState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const { data: planning } = await supabase
    .from("music_plannings")
    .select("id, title, description, style_description, vocal_gender, lang")
    .eq("id", planningId)
    .eq("user_id", user.id)
    .single();
  if (!planning) return { error: "기획을 찾을 수 없습니다." };
  if (!planning.title || !planning.style_description)
    return { error: "기획이 아직 완료되지 않았습니다(제목·스타일 없음)." };

  const apiKey = await resolveApiKey(supabase, user.id, "openai");
  if (!apiKey) return { needsApiKey: "openai" };

  const vocalGender =
    options.vocalGender === undefined
      ? planning.vocal_gender
      : (VOCAL_GENDER_OPTIONS as string[]).includes(options.vocalGender ?? "")
        ? (options.vocalGender as VocalGender)
        : null;
  try {
    const lyrics = (
      await generateLyrics(
        {
          title: planning.title,
          description: planning.description ?? "",
          lang: options.lang?.trim() || planning.lang,
          styleDescription: planning.style_description,
          vocalGender,
        },
        apiKey,
      )
    )
      .trim()
      .slice(0, LYRICS_MAX);
    if (!lyrics) return { error: "AI가 빈 가사를 돌려줬습니다. 다시 시도해 주세요." };
    const { error } = await supabase
      .from("music_plannings")
      .update({ lyrics })
      .eq("id", planningId)
      .eq("user_id", user.id);
    if (error) return { error: error.message };
    await logProgramUsage({ userId: user.id, action: "generate_lyrics", metadata: { planningId } });
    revalidatePath(`/plannings/${planningId}`);
    return { lyrics };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "가사 생성 중 오류가 발생했습니다." };
  }
}

/** 고친 가사를 저장한다. 빈 값으로 저장하면 예전처럼 곡을 만들 때 AI가 새로 작사한다. */
export async function savePlanningLyricsAction(planningId: string, lyrics: string): Promise<PlanningLyricsState> {
  const user = await requireProgramAccess();
  const text = lyrics.replace(/\r\n/g, "\n").trim();
  if (text.length > LYRICS_MAX) return { error: `가사는 ${LYRICS_MAX.toLocaleString()}자까지 저장할 수 있습니다.` };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("music_plannings")
    .update({ lyrics: text || null })
    .eq("id", planningId)
    .eq("user_id", user.id)
    .select("id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "기획을 찾을 수 없습니다." };
  revalidatePath(`/plannings/${planningId}`);
  return { lyrics: text };
}
