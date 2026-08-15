"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProgramAccess, logProgramUsage } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/apiKeys";
import { generateStyleAndExclude, generateTitleAndDescription } from "@/lib/ai/musicPrompts";
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
