"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { generateReportForTopic } from "@/lib/reportEngine";
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
    lookbackDays: formData.get("lookbackDays"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("kakao_topics").insert({
    user_id: user.id,
    topic_name: parsed.data.topicName,
    keywords: parsed.data.keywords,
    lookback_days: parsed.data.lookbackDays,
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

export interface UpdateScheduleState {
  error?: string;
}

/**
 * 주제별 "데이터 조회 범위"와 "예약 발송(정기 자동 생성) 켜기/끄기 + 주기"를 함께 수정한다.
 * 예약은 기본값이 꺼짐(schedule_enabled=false)이라, 회원이 명시적으로 켜야만
 * Phase 3 크론(app/api/cron/generate-reports)의 자동 생성 대상이 된다.
 */
export async function updateTopicScheduleAction(
  _prevState: UpdateScheduleState,
  formData: FormData,
): Promise<UpdateScheduleState> {
  const user = await requireProgramAccess();
  const id = String(formData.get("id") ?? "");
  const lookbackDays = Number(formData.get("lookbackDays") ?? 14);
  const scheduleEnabled = formData.get("scheduleEnabled") === "true";
  const intervalMinutes = Number(formData.get("intervalMinutes") ?? 1440);

  if (!id) return { error: "주제를 찾을 수 없습니다." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("kakao_topics")
    .update({
      lookback_days: lookbackDays,
      schedule_enabled: scheduleEnabled,
      interval_minutes: intervalMinutes,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/topics");
  return {};
}

export interface GenerateReportState {
  error?: string;
}

/**
 * 주제 1건에 대해 "지금 생성" — Perplexity로 최신 정보를 검색하고, AI가 제목/카카오 발송용
 * 요약/웹 리포트용 전체 본문으로 구조화해서 kakao_reports에 저장한다. 실제 생성 로직은
 * Phase 3 예약 자동 생성 크론과 공유하기 위해 lib/reportEngine.ts로 분리했다.
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
    .select("id, topic_name, keywords, lookback_days")
    .eq("id", topicId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (topicError || !topic) return { error: "주제를 찾을 수 없습니다." };

  let reportId: string;
  try {
    const result = await generateReportForTopic(supabase, user.id, topic, "manual");
    reportId = result.reportId;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다." };
  }

  revalidatePath("/reports");
  redirect(`/reports/${reportId}`);
}
