"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_NOTIFY_DAYS, EVENT_KINDS, parseKst, type EventKind } from "@/lib/desk/eventRules";
import { ensureMemberSchedulerRunning, memberCronjobKey, memberSchedulerMode, platformSchedulerEnabled, stopMemberSchedulerIfIdle } from "@/lib/schedulerMember/memberScheduler";

// 3단계(2026-11-03, v1.04): 일정(임장·계약·중도금·잔금·만기). 모든 쓰기는 회원 권한 + user_id 조건.
type SupabaseLike = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any
const EVENTS = "realty_desk_events";

export interface EventState {
  error?: string;
  success?: string;
  warning?: string;
}

/** 일정이 생기거나 없어진 뒤 회원 실행 작업 맞추기(booking-reminder syncMemberScheduler와 같은 규칙). 알림 준비가 안 됐으면 안내를 돌려준다(일정은 저장). */
async function syncScheduler(userId: string, added: boolean): Promise<string | null> {
  const service = createAdminClient() as unknown as SupabaseClient;
  const mode = await memberSchedulerMode(service, userId);
  if (!added) {
    if (mode === "cronjob") await stopMemberSchedulerIfIdle(service, userId).catch(() => false);
    return null;
  }
  if (mode === "cronjob") {
    const key = await memberCronjobKey(service, userId);
    if (!key) return "일정은 저장했어요. 아침 알림을 받으려면 「API키등록·플랫폼연동」에서 본인 무료 cron-job.org 키를 넣어 주세요.";
    try { await ensureMemberSchedulerRunning(service, userId, key); } catch (err) { return `알림 작업을 켜지 못했어요. ${err instanceof Error ? err.message : ""}`.trim(); }
    return null;
  }
  return platformSchedulerEnabled() ? null : "일정은 저장했어요. 아침 알림을 받으려면 「API키등록·플랫폼연동」에서 본인 무료 cron-job.org 키를 넣어 주세요.";
}

export async function addEventAction(_prev: EventState, fd: FormData): Promise<EventState> {
  const user = await requireProgramAccess();
  const kind = String(fd.get("kind") ?? "") as EventKind;
  if (!(EVENT_KINDS as readonly string[]).includes(kind)) return { error: "일정 종류를 골라 주세요." };
  const title = String(fd.get("title") ?? "").trim().slice(0, 60);
  if (!title) return { error: "일정 이름을 넣어 주세요(예: 백석동 84㎡ 잔금)." };
  const at = parseKst(String(fd.get("day") ?? ""), String(fd.get("time") ?? ""));
  if (!at) return { error: "날짜를 골라 주세요." };
  if (at.getTime() < Date.now() - 86_400_000) return { error: "지난 날짜는 넣을 수 없어요." };
  const rawDays = String(fd.get("notifyDays") ?? "").trim();
  const notifyDays = rawDays === "" ? DEFAULT_NOTIFY_DAYS[kind] : Number(rawDays);
  if (!Number.isInteger(notifyDays) || notifyDays < 0 || notifyDays > 90) return { error: "알림은 0~90일 전으로 넣어 주세요." };
  const uuid = (k: string) => { const v = String(fd.get(k) ?? ""); return /^[0-9a-f-]{36}$/.test(v) ? v : null; };
  const db = (await createClient()) as unknown as SupabaseLike;
  const { error } = await db.from(EVENTS).insert({
    user_id: user.id, kind, title, event_at: at.toISOString(), notify_days: notifyDays,
    client_id: uuid("clientId"), listing_id: uuid("listingId"), memo: String(fd.get("memo") ?? "").trim().slice(0, 500) || null,
  });
  if (error) return { error: `저장하지 못했어요: ${error.message}` };
  const warning = await syncScheduler(user.id, true);
  revalidatePath("/events");
  revalidatePath("/dashboard");
  return { success: "일정을 저장했어요.", warning: warning ?? undefined };
}

export async function toggleEventDoneAction(fd: FormData): Promise<void> {
  const user = await requireProgramAccess();
  const db = (await createClient()) as unknown as SupabaseLike;
  await db.from(EVENTS).update({ done: fd.get("done") === "1" }).eq("id", String(fd.get("id") ?? "")).eq("user_id", user.id);
  await syncScheduler(user.id, fd.get("done") !== "1");
  revalidatePath("/events");
  revalidatePath("/dashboard");
}

export async function deleteEventAction(fd: FormData): Promise<void> {
  const user = await requireProgramAccess();
  const db = (await createClient()) as unknown as SupabaseLike;
  await db.from(EVENTS).delete().eq("id", String(fd.get("id") ?? "")).eq("user_id", user.id);
  await syncScheduler(user.id, false);
  revalidatePath("/events");
  revalidatePath("/dashboard");
}
