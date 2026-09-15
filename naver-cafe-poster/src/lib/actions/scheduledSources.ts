"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { runScheduledSource } from "@/lib/scheduledSource/engine";
import type { ScheduledSource } from "@/types/post";

export interface ScheduledSourceState {
  error?: string;
}

/**
 * 글감 소스(HTTP/RSS/Perplexity) + 게시할 카페 게시판 + 자동 포스팅 여부를 등록한다.
 * "글감 수집" 폼에서 "예약 자동화로 등록" 토글을 켜서 바로 만드는 경로이므로,
 * scheduleEnabled/intervalMinutes를 명시하면 등록과 동시에 예약이 켜진 상태로 시작한다
 * (kakao_auto_poster의 kakao_topics.schedule_enabled 기본값 원칙과 달리, 이 프로젝트는
 * 등록 폼 자체가 "예약하겠다"는 명시적 의사표시이므로 기본을 켬으로 둔다).
 */
export async function createScheduledSourceAction(
  _prevState: ScheduledSourceState,
  formData: FormData,
): Promise<ScheduledSourceState> {
  const user = await requireProgramAccess();
  const sourceType = String(formData.get("sourceType") ?? "");
  const isPool = sourceType === "candidate_pool";
  // candidate_pool 타입은 별도 컬럼 없이 source_input에 "카테고리 필터"(카테고리 id, 빈
  // 문자열=전체)를 담는다. 실제 카테고리 이름 표시는 화면에서 categories 목록으로 조회한다.
  const categoryId = String(formData.get("categoryId") ?? "").trim();
  const sourceInput = isPool ? categoryId : String(formData.get("sourceInput") ?? "").trim();
  const sourceLabel = isPool
    ? "🎲 후보함에서 랜덤 선택"
    : String(formData.get("sourceLabel") ?? sourceInput).trim();
  const targetId = String(formData.get("targetId") ?? "");
  const autoPost = formData.get("autoPost") === "true";
  const scheduleEnabled = formData.get("scheduleEnabled") !== "false";
  const intervalMinutes = Number(formData.get("intervalMinutes") ?? 1440);

  if (!["http", "rss", "perplexity", "candidate_pool"].includes(sourceType)) {
    return { error: "알 수 없는 수집 방식입니다." };
  }
  if (!isPool && !sourceInput) return { error: "수집 대상을 입력해주세요." };
  if (!targetId) return { error: "게시할 카페를 선택해주세요." };

  const supabase = await createClient();
  const { error } = await supabase.from("ncafe_scheduled_sources").insert({
    user_id: user.id,
    source_type: sourceType,
    source_input: sourceInput,
    source_label: sourceLabel || sourceInput,
    target_id: targetId,
    auto_post: autoPost,
    schedule_enabled: scheduleEnabled,
    interval_minutes: intervalMinutes,
  });

  if (error) return { error: error.message };

  revalidatePath("/candidates");
  return {};
}

export interface UpdateScheduledSourceState {
  error?: string;
}

/** 예약 ON/OFF·주기·자동 포스팅 여부를 바꾼다 — 값이 바뀌는 즉시 자동 저장(별도 저장 버튼 없음). */
export async function updateScheduledSourceAction(
  _prevState: UpdateScheduledSourceState,
  formData: FormData,
): Promise<UpdateScheduledSourceState> {
  const user = await requireProgramAccess();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "소스를 찾을 수 없습니다." };

  const scheduleEnabled = formData.get("scheduleEnabled") === "true";
  const intervalMinutes = Number(formData.get("intervalMinutes") ?? 1440);
  const autoPost = formData.get("autoPost") === "true";

  const supabase = await createClient();
  const { error } = await supabase
    .from("ncafe_scheduled_sources")
    .update({ schedule_enabled: scheduleEnabled, interval_minutes: intervalMinutes, auto_post: autoPost })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/candidates");
  return {};
}

export async function deleteScheduledSourceAction(formData: FormData) {
  const user = await requireProgramAccess();
  const id = String(formData.get("id") ?? "");

  const supabase = await createClient();
  await supabase.from("ncafe_scheduled_sources").delete().eq("id", id).eq("user_id", user.id);

  revalidatePath("/candidates");
}

export interface RunNowState {
  error?: string;
  success?: boolean;
}

/** "지금 실행" 수동 버튼 — 예약을 기다리지 않고 즉시 1건 생성(+ auto_post면 즉시 게시)한다. */
export async function runScheduledSourceNowAction(
  _prevState: RunNowState,
  formData: FormData,
): Promise<RunNowState> {
  const user = await requireProgramAccess();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "소스를 찾을 수 없습니다." };

  const supabase = await createClient();
  const { data: source } = await supabase
    .from("ncafe_scheduled_sources")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!source) return { error: "소스를 찾을 수 없습니다." };

  const result = await runScheduledSource(supabase, user.id, source as ScheduledSource);

  revalidatePath("/candidates");
  revalidatePath("/drafts");
  revalidatePath("/posts");

  if (!result.success) return { error: result.error };
  return { success: true };
}
