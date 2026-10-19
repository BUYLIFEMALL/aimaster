import "server-only";
import { createHash, randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { MEMBER_DISPATCH_PATH, deleteDispatchJob, setDispatchJobEnabled, upsertDispatchJob } from "@/threads-content-ops/lib/cronJobOrg";
import { THREADS_CONTENT_OPS_ORIGIN } from "@/threads-content-ops/lib/oauth";

// 회원별 예약 발행 실행(v2.07, 2026-10-19). 지침: 루트 docs/SCHEDULER_POLICY.md
// · 회원은 설정 화면에서 본인 cron-job.org API 키만 등록한다. 예약은 포스팅 쪽(콘텐츠 생성 STEP 5·보관함)에서만 한다.
// · 회원이 예약하면 프로그램이 회원 cron-job.org에 1분 확인 작업을 자동으로 만들고 켠다(회원 전용 토큰, DB엔 해시만).
// · 회원 전용 실행 주소가 돌 때 남은 예약 글이 0건이면 작업을 자동으로 끈다 → 예약이 있을 때만 호출이 생긴다.
// · 회원이 「예약 발행 일시정지」를 누르면 작업을 끄고, 재개하면 남은 예약이 있을 때 다시 켠다.
// · AIMaster 제공 실행(운영자 Vercel 1분 호출)은 관리자가 지정했을 때만(TCO_PLATFORM_SCHEDULER=on) 키 없는 회원 글을 발행한다.

export const SCHEDULER_TABLE = "tco_member_scheduler";
export const CRONJOB_PROVIDER = "cronjob_org_api_key";

type SchedulerRow = { user_id: string; active: boolean; paused: boolean };

/** 관리자가 이 프로그램에 AIMaster 제공 예약 실행을 지정했는가 */
export function platformSchedulerEnabled(): boolean {
  return process.env.TCO_PLATFORM_SCHEDULER?.trim().toLowerCase() === "on";
}

export function memberDispatchUrl(): string {
  if (!THREADS_CONTENT_OPS_ORIGIN) throw new Error("사이트 주소를 확인하지 못했습니다.");
  return `${THREADS_CONTENT_OPS_ORIGIN}${MEMBER_DISPATCH_PATH}`;
}

export function hashMemberToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function newMemberToken(): { token: string; hash: string } {
  const token = `tco_${randomBytes(32).toString("hex")}`;
  return { token, hash: hashMemberToken(token) };
}

export async function memberCronjobKey(service: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await service.from("user_api_keys").select("api_key").eq("user_id", userId).eq("provider", CRONJOB_PROVIDER).maybeSingle();
  return (data?.api_key as string | undefined)?.trim() || null;
}

async function schedulerRow(service: SupabaseClient, userId: string): Promise<SchedulerRow | null> {
  const { data } = await service.from(SCHEDULER_TABLE).select("user_id, active, paused").eq("user_id", userId).maybeSingle();
  return (data as SchedulerRow | null) ?? null;
}

async function remainingScheduled(service: SupabaseClient, userId: string): Promise<number> {
  const { count } = await service.from("tco_posts").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "scheduled");
  return count ?? 0;
}

/** 운영자 실행에서 제외할 회원: 본인 cron-job.org 키를 등록한 회원(회원 자원으로만 실행) */
export async function membersWithOwnScheduler(service: SupabaseClient): Promise<string[]> {
  const { data, error } = await service.from("user_api_keys").select("user_id").eq("provider", CRONJOB_PROVIDER);
  if (error) throw new Error("예약 실행 키 목록을 읽지 못했습니다.");
  return (data ?? []).map((row) => row.user_id as string);
}

export async function memberIdForToken(service: SupabaseClient, token: string): Promise<string | null> {
  if (!/^tco_[0-9a-f]{64}$/.test(token)) return null;
  const { data } = await service.from(SCHEDULER_TABLE).select("user_id").eq("token_hash", hashMemberToken(token)).maybeSingle();
  return (data?.user_id as string | undefined) ?? null;
}

/**
 * 예약 직후 호출: 회원 cron-job.org 작업이 켜져 있게 만든다. 이미 켜져 있으면 cron-job.org를 부르지 않는다(하루 100회 한도 절약).
 * 일시정지 중이면 켜지 않고 paused를 돌려준다.
 */
export async function ensureMemberSchedulerRunning(service: SupabaseClient, userId: string, apiKey: string): Promise<{ paused: boolean }> {
  const row = await schedulerRow(service, userId);
  if (row?.paused) return { paused: true };
  if (row?.active) return { paused: false };
  const url = memberDispatchUrl();
  if (row && (await setDispatchJobEnabled(apiKey, url, true))) {
    await service.from(SCHEDULER_TABLE).update({ active: true, updated_at: new Date().toISOString() }).eq("user_id", userId);
    return { paused: false };
  }
  // 처음 연결이거나 회원이 cron-job.org에서 작업을 지운 경우: 새 토큰으로 작업을 만든다. 토큰을 먼저 저장해야 첫 호출이 401이 되지 않는다.
  const { token, hash } = newMemberToken();
  const { error } = await service.from(SCHEDULER_TABLE).upsert({ user_id: userId, token_hash: hash, active: false, paused: false, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) throw new Error("예약 실행 연결 정보를 저장하지 못했습니다.");
  const jobId = await upsertDispatchJob(apiKey, url, token);
  await service.from(SCHEDULER_TABLE).update({ cronjob_job_id: jobId, active: true, updated_at: new Date().toISOString() }).eq("user_id", userId);
  return { paused: false };
}

/** 회원 전용 실행이 끝날 때: 남은 예약이 없으면 작업을 끈다. 끄는 사이 새 예약이 들어왔으면 다시 켠다. */
export async function stopMemberSchedulerIfIdle(service: SupabaseClient, userId: string): Promise<boolean> {
  if ((await remainingScheduled(service, userId)) > 0) return false;
  const key = await memberCronjobKey(service, userId);
  if (!key) return false;
  const url = memberDispatchUrl();
  await setDispatchJobEnabled(key, url, false);
  await service.from(SCHEDULER_TABLE).update({ active: false, updated_at: new Date().toISOString() }).eq("user_id", userId);
  if ((await remainingScheduled(service, userId)) > 0) {
    await setDispatchJobEnabled(key, url, true);
    await service.from(SCHEDULER_TABLE).update({ active: true, updated_at: new Date().toISOString() }).eq("user_id", userId);
    return false;
  }
  return true;
}

export async function pauseMemberScheduler(service: SupabaseClient, userId: string): Promise<void> {
  const key = await memberCronjobKey(service, userId);
  if (key) await setDispatchJobEnabled(key, memberDispatchUrl(), false);
  if (await schedulerRow(service, userId)) {
    await service.from(SCHEDULER_TABLE).update({ active: false, paused: true, updated_at: new Date().toISOString() }).eq("user_id", userId);
  } else {
    // 아직 연결 전이면 자리표시 해시로 행만 만든다(형식이 달라 실행 주소 토큰으로는 절대 맞지 않음). 첫 예약 연결 때 진짜 토큰으로 바뀐다.
    await service.from(SCHEDULER_TABLE).insert({ user_id: userId, token_hash: `unset-${userId}`, active: false, paused: true });
  }
}

export async function resumeMemberScheduler(service: SupabaseClient, userId: string): Promise<{ started: boolean }> {
  await service.from(SCHEDULER_TABLE).update({ paused: false, updated_at: new Date().toISOString() }).eq("user_id", userId);
  const key = await memberCronjobKey(service, userId);
  if (!key || (await remainingScheduled(service, userId)) === 0) return { started: false };
  await ensureMemberSchedulerRunning(service, userId, key);
  return { started: true };
}

/** cron-job.org 키를 지울 때: 회원 작업과 연결 정보도 함께 지운다(실패해도 키 삭제는 진행). */
export async function removeMemberScheduler(service: SupabaseClient, userId: string): Promise<void> {
  const key = await memberCronjobKey(service, userId);
  if (key) {
    try { await deleteDispatchJob(key, memberDispatchUrl()); } catch { /* 키가 이미 무효일 수 있음 — 연결 정보만 지운다 */ }
  }
  await service.from(SCHEDULER_TABLE).delete().eq("user_id", userId);
}

export type MemberSchedulerState = { state: "platform" | "no-key" | "paused" | "running" | "idle"; scheduled: number };

/** 화면 표시용(cron-job.org를 부르지 않고 DB만 본다) */
export async function memberSchedulerState(service: SupabaseClient, userId: string): Promise<MemberSchedulerState> {
  const [key, row, scheduled] = await Promise.all([memberCronjobKey(service, userId), schedulerRow(service, userId), remainingScheduled(service, userId)]);
  if (!key) return { state: platformSchedulerEnabled() ? "platform" : "no-key", scheduled };
  if (row?.paused) return { state: "paused", scheduled };
  return { state: row?.active ? "running" : "idle", scheduled };
}
