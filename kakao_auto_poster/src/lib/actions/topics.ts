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
  // "동작 시간대"(종일/특정 시간대만) — real_estate_sales의 MonitoringSettings.tsx /
  // trending-product-finder Phase 14·18과 동일한 패턴. hoursRestricted가 false면
  // active_hour_start/end를 null로 저장해 "종일"을 의미한다.
  const hoursRestricted = formData.get("hoursRestricted") === "true";
  const activeHourStart = hoursRestricted ? Number(formData.get("activeHourStart") ?? 9) : null;
  const activeHourEnd = hoursRestricted ? Number(formData.get("activeHourEnd") ?? 22) : null;
  // 알림 채널 칩(이메일/텔레그램) — trending-product-finder의 SourcingAlertControls.tsx와
  // 동일한 방식. 카카오톡은 포함하지 않는다(위 파일 상단 주석 참고).
  const notifyChannels = formData.getAll("notifyChannels").map(String);

  if (!id) return { error: "주제를 찾을 수 없습니다." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("kakao_topics")
    .update({
      lookback_days: lookbackDays,
      schedule_enabled: scheduleEnabled,
      interval_minutes: intervalMinutes,
      active_hour_start: activeHourStart,
      active_hour_end: activeHourEnd,
      notify_channels: notifyChannels,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/topics");
  return {};
}

export interface UpdateKeywordsState {
  error?: string;
  keywords?: string[];
}

/**
 * 주제 하나에 등록된 키워드 배열만 수정한다(개별 키워드 추가/삭제) — 전에는 카테고리
 * 전체(주제 전체)를 지우고 다시 등록해야 특정 키워드 하나를 뺄 수 있었다. 카테고리에
 * 여러 키워드가 묶여 있을 때 필요 없어진 키워드만 골라 빼는 실사용성 공백을 메운다
 * (trending-product-finder의 updateWatchlistKeywordsAction과 동일한 패턴).
 */
export async function updateTopicKeywordsAction(formData: FormData): Promise<UpdateKeywordsState> {
  const user = await requireProgramAccess();
  const id = String(formData.get("id") ?? "");
  const keywords = formData
    .getAll("keywords")
    .map(String)
    .map((k) => k.trim())
    .filter(Boolean);

  if (!id) return { error: "주제를 찾을 수 없습니다." };
  if (keywords.length === 0) {
    return { error: "키워드가 1개 이상 있어야 합니다. 전부 지우려면 이 주제 자체를 삭제해주세요." };
  }
  if (keywords.length > 10) {
    return { error: "키워드는 주제 하나당 최대 10개까지 등록할 수 있습니다." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("kakao_topics")
    .update({ keywords })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/topics");
  return { keywords };
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
    .select("id, topic_name, keywords, lookback_days, notify_channels")
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
