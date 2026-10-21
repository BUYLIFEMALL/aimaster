"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { generateTracksAction } from "@/lib/actions/tracks";
import { isSunoModel, DEFAULT_SUNO_MODEL } from "@/lib/ai/suno";

// 정밀 기획 스튜디오 → Suno 실제 생성(2026-10-21 병합 M1 3단계).
// 스튜디오에서 다듬은 곡(제목·Style·제외 스타일·가사)을 그대로 「음악 생성 · 트랙 관리」 기획 1건으로 만들고,
// generateTracksAction의 fixedPrompt 경로로 GPT 재작성 없이 Suno에 보낸다. 결과는 기존 트랙 화면(연장·MR·WAV·리믹스)으로 이어진다.

export interface SendStudioTrackInput {
  title: string;
  summary: string;
  style: string;
  exclude: string;
  lyrics: string;
  voice?: string;
  instrumental: boolean;
  model?: string;
  variety?: number;
  personaId?: string | null;
}

export interface SendStudioTrackState {
  planningId?: string;
  error?: string;
  needsApiKey?: string;
}

function text(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export async function sendStudioTrackToSunoAction(input: SendStudioTrackInput): Promise<SendStudioTrackState> {
  const user = await requireProgramAccess();

  const title = text(input.title, 80);
  const style = text(input.style, 1000);
  const exclude = text(input.exclude, 1000);
  const lyrics = text(input.lyrics, 5000);
  const summary = text(input.summary, 1000);
  const instrumental = input.instrumental === true;
  if (!title) return { error: "곡 제목을 먼저 입력해 주세요." };
  if (!style) return { error: "Style을 먼저 입력해 주세요." };
  if (!instrumental && !lyrics) return { error: "가사를 먼저 작성하거나 생성해 주세요." };

  const voice = text(input.voice, 50);
  // 「혼성」은 기록만 하고 Suno에는 성별을 보내지 않는다(toSunoVocalGender가 m/f만 보냄).
  const vocalGender = instrumental
    ? null
    : voice.includes("혼성")
      ? ("혼성" as const)
      : voice.includes("여성")
        ? ("여성" as const)
        : voice.includes("남성")
          ? ("남성" as const)
          : null;
  const model = isSunoModel(input.model) ? input.model : DEFAULT_SUNO_MODEL;

  const supabase = await createClient();
  const { data: planning, error } = await supabase
    .from("music_plannings")
    .insert({
      user_id: user.id,
      song_description: summary || title,
      vocal_gender: vocalGender,
      lang: "한국어",
      style_description: style,
      exclude_styles: exclude,
      title,
      description: summary || "정밀 기획 스튜디오에서 보낸 곡",
      status: "planned",
    })
    .select("id")
    .single();
  if (error || !planning) return { error: "기획을 저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요." };

  // 연주곡의 prompt는 가사가 아니라 곡 설명(BGM 설명)으로 쓰인다.
  const fixedPrompt = instrumental ? lyrics || summary || style : lyrics;
  const result = await generateTracksAction(planning.id, [instrumental ? "instrumental" : "vocal"], {
    fixedPrompt,
    model,
    variety: input.variety,
    personaId: input.personaId,
    vocalGender,
  });
  if (result.error || result.needsApiKey) {
    // Suno 요청이 실패하면 빈 기획이 남지 않게 지운다(방금 만든 본인 행).
    await supabase.from("music_plannings").delete().eq("id", planning.id).eq("user_id", user.id);
    return { error: result.error, needsApiKey: result.needsApiKey };
  }
  revalidatePath("/plannings");
  return { planningId: planning.id };
}
