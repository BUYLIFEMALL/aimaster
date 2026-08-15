"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProgramAccess, logProgramUsage } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/apiKeys";
import {
  generateStyleAndExclude,
  generateTitleAndDescription,
  reconcileSongDescriptionWithVocalGender,
} from "@/lib/ai/musicPrompts";
import type { VocalGender } from "@/types/database.types";

export interface PlanMusicState {
  error?: string;
  needsApiKey?: boolean;
  planningId?: string;
}

/** n8n(Make.com) 시나리오 01 앞부분 대응: 곡 설명 → GPT로 스타일/제목/설명을 기획한다. */
export async function planMusicAction(formData: FormData): Promise<PlanMusicState> {
  const user = await requireProgramAccess();
  const songDescription = String(formData.get("songDescription") ?? "").trim();
  const vocalGenderRaw = String(formData.get("vocalGender") ?? "").trim();
  const vocalGender: VocalGender | null = vocalGenderRaw === "여성" || vocalGenderRaw === "남성" ? vocalGenderRaw : null;
  const lang = String(formData.get("lang") ?? "한국어").trim() || "한국어";

  if (!songDescription) {
    return { error: "곡 설명을 입력해주세요." };
  }

  const supabase = await createClient();
  const apiKey = await resolveApiKey(supabase, user.id, "openai");
  if (!apiKey) {
    return { needsApiKey: true };
  }

  try {
    const [styleResult, titleResult] = await Promise.all([
      generateStyleAndExclude({ songDescription, vocalGender }, apiKey),
      generateTitleAndDescription({ songDescription, vocalGender, lang }, apiKey),
    ]);

    const { data: planning, error } = await supabase
      .from("music_plannings")
      .insert({
        user_id: user.id,
        song_description: songDescription,
        vocal_gender: vocalGender,
        lang,
        style_description: styleResult.styleDescription,
        exclude_styles: styleResult.excludeStyles,
        title: titleResult.title,
        description: titleResult.description,
        status: "planned",
      })
      .select("id")
      .single();

    if (error || !planning) {
      return { error: error?.message ?? "곡 기획 저장에 실패했습니다." };
    }

    await logProgramUsage({ userId: user.id, action: "plan_music", metadata: { songDescription } });
    revalidatePath("/plannings");
    return { planningId: planning.id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "곡 기획 중 오류가 발생했습니다." };
  }
}

export interface UpdatePlanningState {
  error?: string;
  needsApiKey?: boolean;
  success?: boolean;
  restyled?: boolean; // 보컬 성별이 바뀌어서 스타일을 자동으로 다시 만들었는지
}

/**
 * GPT가 기획한 제목/설명/스타일/제외스타일 등을 사용자가 직접 고칠 수 있게 한다.
 * 기본적으로는 GPT를 다시 호출하지 않고 값만 그대로 저장한다 — 이후 "생성하기"를 누르면
 * 이 수정된 값을 기준으로 트랙이 생성된다. 이미 생성된 트랙에는 소급 적용되지 않는다.
 *
 * 단, **보컬 성별이 바뀌면 곡 설명 텍스트와 스타일 설명/제외 스타일을 GPT로 함께 다시
 * 맞춘다.** 스타일 설명은 "male vocals"/"female vocals" 같은 성별 문구가 영문 텍스트 안에
 * 그대로 박혀 있고, 곡 설명 자유 텍스트에도 "남성보컬" 같은 언급이 남아있을 수 있어서, 성별
 * 드롭다운만 바꾸고 텍스트들을 그대로 두면 GPT가 상충되는 신호를 절충해 여전히 예전 성별이
 * 섞여 나오는 문제가 있었다(2026-08-15, 남성→여성으로 바꿔 재생성했는데 남성 보컬이 섞여
 * 나온 문제를 이렇게 확인·수정함). 곡 설명은 성별 언급만 고치고 나머지 내용은 그대로 둔다.
 */
export async function updatePlanningAction(
  planningId: string,
  fields: {
    title: string;
    description: string;
    songDescription: string;
    styleDescription: string;
    excludeStyles: string;
    vocalGender: VocalGender | null;
    lang: string;
  },
): Promise<UpdatePlanningState> {
  const user = await requireProgramAccess();

  const title = fields.title.trim();
  let songDescription = fields.songDescription.trim();
  let styleDescription = fields.styleDescription.trim();
  let excludeStyles = fields.excludeStyles.trim();
  const lang = fields.lang.trim() || "한국어";

  if (!title || !songDescription || !styleDescription) {
    return { error: "제목, 곡 설명, 스타일은 비워둘 수 없습니다." };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("music_plannings")
    .select("vocal_gender")
    .eq("id", planningId)
    .eq("user_id", user.id)
    .single();
  if (!existing) {
    return { error: "기획을 찾을 수 없습니다." };
  }

  let restyled = false;
  const vocalGenderChanged = (existing.vocal_gender ?? null) !== (fields.vocalGender ?? null);
  if (vocalGenderChanged) {
    const apiKey = await resolveApiKey(supabase, user.id, "openai");
    if (!apiKey) {
      return { error: "보컬 성별을 바꾸면 스타일도 다시 만들어야 하는데, OpenAI API 키가 없습니다. 설정에서 등록해주세요." };
    }
    try {
      songDescription = await reconcileSongDescriptionWithVocalGender(
        songDescription,
        fields.vocalGender,
        apiKey,
      );
      const styleResult = await generateStyleAndExclude(
        { songDescription, vocalGender: fields.vocalGender },
        apiKey,
      );
      styleDescription = styleResult.styleDescription;
      excludeStyles = styleResult.excludeStyles;
      restyled = true;
    } catch (err) {
      return { error: err instanceof Error ? err.message : "스타일 재생성 중 오류가 발생했습니다." };
    }
  }

  const { error } = await supabase
    .from("music_plannings")
    .update({
      title,
      description: fields.description.trim(),
      song_description: songDescription,
      style_description: styleDescription,
      exclude_styles: excludeStyles,
      vocal_gender: fields.vocalGender,
      lang,
    })
    .eq("id", planningId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/plannings/${planningId}`);
  revalidatePath("/plannings");
  return { success: true, restyled };
}

/** 기획을 삭제한다(연결된 트랙/variant도 cascade로 함께 삭제됨). */
export async function deletePlanningAction(formData: FormData) {
  const user = await requireProgramAccess();
  const planningId = String(formData.get("planningId") ?? "");
  if (!planningId) return;

  const supabase = await createClient();
  await supabase.from("music_plannings").delete().eq("id", planningId).eq("user_id", user.id);

  revalidatePath("/plannings");
  redirect("/plannings");
}
