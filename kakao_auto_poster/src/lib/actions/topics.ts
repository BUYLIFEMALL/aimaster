"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/apiKeys";
import { searchPerplexityInfo, structureKakaoReport } from "@/lib/ai/collector";
import { topicFormSchema } from "@/lib/validation";

export interface CreateTopicState {
  error?: string;
}

export async function createTopicAction(
  _prevState: CreateTopicState,
  formData: FormData,
): Promise<CreateTopicState> {
  const user = await requireProgramAccess();

  const parsed = topicFormSchema.safeParse({
    topicName: formData.get("topicName"),
    keywords: formData.get("keywords"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("kakao_topics").insert({
    user_id: user.id,
    topic_name: parsed.data.topicName,
    keywords: parsed.data.keywords,
  });

  if (error) return { error: error.message };

  revalidatePath("/topics");
  return {};
}

export async function toggleTopicActiveAction(formData: FormData) {
  const user = await requireProgramAccess();
  const id = String(formData.get("id") ?? "");
  const isActive = formData.get("isActive") === "true";
  const supabase = await createClient();

  await supabase
    .from("kakao_topics")
    .update({ is_active: !isActive })
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/topics");
}

export async function deleteTopicAction(formData: FormData) {
  const user = await requireProgramAccess();
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();

  await supabase.from("kakao_topics").delete().eq("id", id).eq("user_id", user.id);

  revalidatePath("/topics");
}

export interface GenerateReportState {
  error?: string;
}

/**
 * 주제 1건에 대해 "지금 생성" — Perplexity로 최신 정보를 검색하고, AI가 제목/카카오 발송용
 * 요약/웹 리포트용 전체 본문으로 구조화해서 kakao_reports에 저장한다. Phase 1은 이 수동
 * 생성만 지원하고, 정기 자동 생성(크론)은 Phase 3에서 추가한다.
 */
export async function generateReportAction(
  _prevState: GenerateReportState,
  formData: FormData,
): Promise<GenerateReportState> {
  const user = await requireProgramAccess();
  const topicId = String(formData.get("topicId") ?? "");
  if (!topicId) return { error: "주제를 찾을 수 없습니다." };

  const supabase = await createClient();
  const { data: topic, error: topicError } = await supabase
    .from("kakao_topics")
    .select("id, topic_name, keywords")
    .eq("id", topicId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (topicError || !topic) return { error: "주제를 찾을 수 없습니다." };

  const perplexityKey = await resolveApiKey(supabase, user.id, "perplexity");
  const openaiKey = await resolveApiKey(supabase, user.id, "openai");

  let reportId: string;
  try {
    const rawText = await searchPerplexityInfo(topic.topic_name, topic.keywords, perplexityKey ?? "");
    const draft = await structureKakaoReport({ rawText, apiKey: openaiKey ?? "" });

    const { data: inserted, error: insertError } = await supabase
      .from("kakao_reports")
      .insert({
        user_id: user.id,
        topic_id: topic.id,
        title: draft.title,
        summary: draft.summary,
        content: draft.content,
      })
      .select("id")
      .single();

    if (insertError || !inserted) return { error: insertError?.message ?? "리포트 저장에 실패했습니다." };
    reportId = inserted.id;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다." };
  }

  revalidatePath("/reports");
  redirect(`/reports/${reportId}`);
}
