"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { runScheduledSource } from "@/lib/scheduledSource/engine";
import type { ScheduledSource } from "@/types/post";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureMemberSchedulerRunning, memberCronjobKey, memberSchedulerMode, platformSchedulerEnabled, stopMemberSchedulerIfIdle } from "@/lib/scheduledSource/memberScheduler";

/**
 * 정기 실행 스위치가 바뀐 뒤 회원 실행 작업 맞추기(v1.21, 지침 docs/SCHEDULER_POLICY.md).
 * 켰을 때: 고른 방식이 준비 안 됐거나(키 없음·Vercel 꺼짐) cron-job.org 작업을 켜지 못하면 그 소스의 스위치를 다시 끄고 안내를 돌려준다
 * (「켜졌는데 안 도는」 상태를 만들지 않음). 껐을 때: 켜진 소스가 하나도 없으면 회원 작업을 끈다(실패해도 다음 회원 실행 때 다시 끔).
 */
async function syncMemberScheduler(userId: string, sourceId: string, enabledNow: boolean): Promise<string | null> {
  const service = createAdminClient() as unknown as SupabaseClient;
  const mode = await memberSchedulerMode(service, userId);
  if (!enabledNow) {
    if (mode === "cronjob") await stopMemberSchedulerIfIdle(service, userId).catch(() => false);
    return null;
  }
  let error: string | null = null;
  if (mode === "cronjob") {
    const key = await memberCronjobKey(service, userId);
    if (!key) error = "「내 cron-job.org」 방식은 API 키가 필요합니다. 설정 → ⏰ 예약 발행에서 키를 등록하거나 AIMaster 기본(Vercel) 방식을 선택해 주세요.";
    else {
      try {
        await ensureMemberSchedulerRunning(service, userId, key);
      } catch (err) {
        error = `정기 실행 작업을 켜지 못했습니다. ${err instanceof Error ? err.message : ""}`.trim();
      }
    }
  } else if (!platformSchedulerEnabled()) {
    error = "이 사이트는 Vercel 예약 호출이 꺼져 있습니다. 설정 → ⏰ 예약 발행에서 「내 cron-job.org」를 선택하고 키를 등록해 주세요.";
  }
  if (error) await service.from("ncafe_scheduled_sources").update({ schedule_enabled: false }).eq("id", sourceId).eq("user_id", userId);
  return error;
}

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
  // candidate_pool은 새로 수집하는 대상이 없다 — 후보함에서 "예약포스팅 ON"으로 켜둔 후보를
  // 그대로 재료로 쓰므로 sourceInput이 필요 없다. 어느 카테고리 후보만 쓸지는 아래
  // categoryIds(모든 소스 타입이 공유하는 배지/필터 필드)를 그대로 재사용한다.
  const sourceInput = isPool ? "" : String(formData.get("sourceInput") ?? "").trim();
  const sourceLabel = isPool
    ? "🗂️ 게시글 후보에서 예약발행"
    : String(formData.get("sourceLabel") ?? sourceInput).trim();
  const targetId = String(formData.get("targetId") ?? "");
  const autoPost = formData.get("autoPost") === "true";
  const scheduleEnabled = formData.get("scheduleEnabled") !== "false";
  const intervalMinutes = Number(formData.get("intervalMinutes") ?? 1440);
  const categoryIds = formData.getAll("categoryIds").map(String).filter(Boolean);

  if (!["http", "rss", "perplexity", "candidate_pool"].includes(sourceType)) {
    return { error: "알 수 없는 수집 방식입니다." };
  }
  if (!isPool && !sourceInput) return { error: "수집 대상을 입력해주세요." };
  if (!targetId) return { error: "게시할 카페를 선택해주세요." };

  const supabase = await createClient();
  const { data: created, error } = await supabase.from("ncafe_scheduled_sources").insert({
    user_id: user.id,
    source_type: sourceType,
    source_input: sourceInput,
    source_label: sourceLabel || sourceInput,
    target_id: targetId,
    auto_post: autoPost,
    schedule_enabled: scheduleEnabled,
    interval_minutes: intervalMinutes,
    category_ids: categoryIds,
  }).select("id").single();

  if (error) return { error: error.message };

  const syncError = scheduleEnabled ? await syncMemberScheduler(user.id, created.id, true) : null;
  revalidatePath("/candidates");
  return syncError ? { error: `등록은 했지만 정기 실행은 꺼 두었습니다. ${syncError}` } : {};
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

  const syncError = await syncMemberScheduler(user.id, id, scheduleEnabled);
  revalidatePath("/candidates");
  return syncError ? { error: `정기 실행을 켜지 못해 다시 꺼 두었습니다. ${syncError}` } : {};
}

/**
 * 예약 자동화 등록 후 내용을 통째로 수정한다(게시할 카페·카테고리·수집 대상) — 예약 ON/OFF·
 * 주기·자동 포스팅처럼 값이 바뀌는 즉시 저장되는 항목과 달리, "수정" 버튼을 눌러 펼친 뒤
 * "저장"을 눌러야 반영된다. candidate_pool 타입은 수집 대상이 없으므로 sourceInput을
 * 무시하고 source_label도 고정값을 유지한다.
 */
export async function updateScheduledSourceContentAction(
  _prevState: UpdateScheduledSourceState,
  formData: FormData,
): Promise<UpdateScheduledSourceState> {
  const user = await requireProgramAccess();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "소스를 찾을 수 없습니다." };

  const sourceType = String(formData.get("sourceType") ?? "");
  const isPool = sourceType === "candidate_pool";
  const targetId = String(formData.get("targetId") ?? "");
  const categoryIds = formData.getAll("categoryIds").map(String).filter(Boolean);
  const sourceInput = isPool ? "" : String(formData.get("sourceInput") ?? "").trim();
  const sourceLabel = isPool
    ? "🗂️ 게시글 후보에서 예약발행"
    : String(formData.get("sourceLabel") ?? sourceInput).trim() || sourceInput;

  if (!targetId) return { error: "게시할 카페를 선택해주세요." };
  if (!isPool && !sourceInput) return { error: "수집 대상을 입력해주세요." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("ncafe_scheduled_sources")
    .update({
      target_id: targetId,
      category_ids: categoryIds,
      source_input: sourceInput,
      source_label: sourceLabel,
    })
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
  await syncMemberScheduler(user.id, id, false);

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
