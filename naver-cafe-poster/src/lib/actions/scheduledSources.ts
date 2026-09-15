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
 * 예약(schedule_enabled)은 기본 꺼짐 — 회원이 명시적으로 켜야만 크론 대상이 된다
 * (kakao_auto_poster의 kakao_topics.schedule_enabled와 동일한 기본값 원칙).
 */
export async function createScheduledSourceAction(
  _prevState: ScheduledSourceState,
  formData: FormData,
): Promise<ScheduledSourceState> {
  const user = await requireProgramAccess();
  const sourceType = String(formData.get("sourceType") ?? "");
  const sourceInput = String(formData.get("sourceInput") ?? "").trim();
  const sourceLabel = String(formData.get("sourceLabel") ?? sourceInput).trim();
  const targetId = String(formData.get("targetId") ?? "");
  const autoPost = formData.get("autoPost") === "true";

  if (!["http", "rss", "perplexity"].includes(sourceType)) {
    return { error: "알 수 없는 수집 방식입니다." };
  }
  if (!sourceInput) return { error: "수집 대상을 입력해주세요." };
  if (!targetId) return { error: "게시할 카페를 선택해주세요." };

  const supabase = await createClient();
  const { error } = await supabase.from("ncafe_scheduled_sources").insert({
    user_id: user.id,
    source_type: sourceType,
    source_input: sourceInput,
    source_label: sourceLabel || sourceInput,
    target_id: targetId,
    auto_post: autoPost,
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
