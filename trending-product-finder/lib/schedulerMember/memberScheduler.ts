import "server-only";
import { createHash, randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { MEMBER_DISPATCH_PATH, deleteDispatchJob, setDispatchJobEnabled, upsertDispatchJob } from "@/lib/schedulerMember/cronJobOrg";
/** 회원 cron-job.org가 부를 이 사이트 주소(공식 주소 = programs.app_url) */
const SITE_ORIGIN = "https://trending-product-finder.buylife.xyz";

// 회원별 정기 자동 실행 — 회원이 실행 방식을 고른다(v1.15, 2026-10-20 주인님 「2순위도 적용」). 지침: 루트 docs/SCHEDULER_POLICY.md
// 기준 구현: booking-reminder/lib/schedulerMember/memberScheduler.ts(표·토큰·환경변수·사이트 주소와 「켜진 관심 목록·관심 상품 알림」 계산만 바꿈, 원 기준 threads).
// 이 프로그램은 설치 키트(배포판) 모드가 없는 운영 전용이라 기본 방식은 항상 vercel이다.
// · ① vercel(기본): 사이트의 Vercel 예약 호출(리포트 매일 09시·알림 5분마다, vercel.json)이 처리. 회원은 키 없이 관심 목록·알림만 켜 두면 된다.
// · ② cronjob: 회원 본인 cron-job.org API 키 → 관심 목록·관심 상품 알림을 켜면 회원 cron-job.org에 5분 작업을 자동 생성·켜기(회원 전용 토큰, DB엔 해시),
//   켜진 관심 목록·관심 상품 알림이 0개면 자동 끄기.
// · 일시정지는 두 방식 모두: 운영자 호출은 일시정지 회원을 건너뛰고, cronjob 회원은 작업도 끈다.
// · Vercel 방식은 기본 켜짐 — 관리자가 TREND_PLATFORM_SCHEDULER=off로 끌 수 있다.

export const SCHEDULER_TABLE = "trend_member_scheduler";
export const CRONJOB_PROVIDER = "cronjob_org_api_key";

export type SchedulerMode = "vercel" | "cronjob";
/** 기본 실행 방식: 운영 전용 프로그램이라 항상 Vercel */
export const DEFAULT_SCHEDULER_MODE: SchedulerMode = "vercel";
type SchedulerRow = { user_id: string; mode: SchedulerMode; active: boolean; paused: boolean };

/** 사이트의 Vercel 예약 호출로 회원 예약을 처리할 수 있는가 */
export function platformSchedulerEnabled(): boolean {
  return process.env.TREND_PLATFORM_SCHEDULER?.trim().toLowerCase() !== "off";
}

export function memberDispatchUrl(): string {
  if (!SITE_ORIGIN) throw new Error("사이트 주소를 확인하지 못했습니다.");
  return `${SITE_ORIGIN}${MEMBER_DISPATCH_PATH}`;
}

export function hashMemberToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function newMemberToken(): { token: string; hash: string } {
  const token = `trend_${randomBytes(32).toString("hex")}`;
  return { token, hash: hashMemberToken(token) };
}

const now = () => new Date().toISOString();

export async function memberCronjobKey(service: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await service.from("user_api_keys").select("api_key").eq("user_id", userId).eq("provider", CRONJOB_PROVIDER).maybeSingle();
  return (data?.api_key as string | undefined)?.trim() || null;
}

async function schedulerRow(service: SupabaseClient, userId: string): Promise<SchedulerRow | null> {
  const { data } = await service.from(SCHEDULER_TABLE).select("user_id, mode, active, paused").eq("user_id", userId).maybeSingle();
  return (data as SchedulerRow | null) ?? null;
}

/** 회원이 고른 실행 방식(행이 없으면 기본값 vercel) */
export async function memberSchedulerMode(service: SupabaseClient, userId: string): Promise<SchedulerMode> {
  return (await schedulerRow(service, userId))?.mode ?? DEFAULT_SCHEDULER_MODE;
}

/**
 * 이 회원의 정기 작업 수(정기형에서 「남은 일」 = 이것): 켜진 관심 목록(매일 리포트·소싱 알림) + 알림을 켠 관심 상품(가격 알림).
 * 0이면 회원 작업을 끈다.
 */
export async function remainingScheduled(service: SupabaseClient, userId: string): Promise<number> {
  const [{ count: watchlists }, { count: products }] = await Promise.all([
    service.from("trend_watchlist").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("is_active", true),
    service.from("sourcing_saved_products").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("alert_enabled", true),
  ]);
  return (watchlists ?? 0) + (products ?? 0);
}

/** 행이 없으면 자리표시 해시로 만든다(형식이 달라 실행 주소 토큰으로는 절대 맞지 않음). cronjob 첫 연결 때 진짜 토큰으로 바뀐다. */
async function ensureRow(service: SupabaseClient, userId: string): Promise<void> {
  if (await schedulerRow(service, userId)) return;
  await service.from(SCHEDULER_TABLE).insert({ user_id: userId, token_hash: `unset-${userId}`, mode: DEFAULT_SCHEDULER_MODE, active: false, paused: false });
}

/** 운영자(Vercel) 실행에서 제외할 회원: cron-job.org를 고른 회원(본인 호출이 처리) + 일시정지한 회원 */
export async function membersExcludedFromPlatform(service: SupabaseClient): Promise<string[]> {
  const { data, error } = await service.from(SCHEDULER_TABLE).select("user_id").or("mode.eq.cronjob,paused.eq.true");
  if (error) throw new Error("예약 실행 방식 목록을 읽지 못했습니다.");
  return (data ?? []).map((row) => row.user_id as string);
}

export async function memberIdForToken(service: SupabaseClient, token: string): Promise<string | null> {
  if (!/^trend_[0-9a-f]{64}$/.test(token)) return null;
  const { data } = await service.from(SCHEDULER_TABLE).select("user_id, mode").eq("token_hash", hashMemberToken(token)).maybeSingle();
  return data?.mode === "cronjob" ? (data.user_id as string) : null;
}

/**
 * cronjob 회원이 정기 실행을 켠 직후 호출: 회원 cron-job.org 작업이 실제로 켜져 있게 만든다(cron-job.org 호출 1~2회).
 * DB에 켜짐으로 적혀 있어도 cron-job.org가 실패 25회 뒤 작업을 자동으로 껐을 수 있어 매번 실제 상태를 확인한다. 일시정지 중이면 켜지 않는다.
 */
export async function ensureMemberSchedulerRunning(service: SupabaseClient, userId: string, apiKey: string): Promise<{ paused: boolean }> {
  const row = await schedulerRow(service, userId);
  if (row?.paused) return { paused: true };
  const url = memberDispatchUrl();
  if (row && (await memberIdTokenReady(service, userId)) && (await setDispatchJobEnabled(apiKey, url, true))) {
    await service.from(SCHEDULER_TABLE).update({ active: true, updated_at: now() }).eq("user_id", userId);
    return { paused: false };
  }
  // 처음 연결이거나 회원이 cron-job.org에서 작업을 지운 경우: 새 토큰으로 작업을 만든다. 토큰을 먼저 저장해야 첫 호출이 401이 되지 않는다.
  const { token, hash } = newMemberToken();
  const { error } = await service.from(SCHEDULER_TABLE).upsert({ user_id: userId, token_hash: hash, mode: "cronjob", active: false, paused: false, updated_at: now() }, { onConflict: "user_id" });
  if (error) throw new Error("예약 실행 연결 정보를 저장하지 못했습니다.");
  const jobId = await upsertDispatchJob(apiKey, url, token);
  await service.from(SCHEDULER_TABLE).update({ cronjob_job_id: jobId, active: true, updated_at: now() }).eq("user_id", userId);
  return { paused: false };
}

/** 진짜 토큰(자리표시가 아닌 해시)이 저장돼 있는가 — 없으면 작업이 있어도 401이므로 새로 만든다 */
async function memberIdTokenReady(service: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await service.from(SCHEDULER_TABLE).select("token_hash").eq("user_id", userId).maybeSingle();
  return Boolean(data?.token_hash && /^[0-9a-f]{64}$/.test(data.token_hash as string));
}

/** 정기 실행을 끄거나 회원 전용 실행이 끝날 때: 켜진 정기 작업이 없으면 작업을 끈다. 끄는 사이 새로 켜졌으면 다시 켠다. */
export async function stopMemberSchedulerIfIdle(service: SupabaseClient, userId: string): Promise<boolean> {
  if ((await remainingScheduled(service, userId)) > 0) return false;
  const key = await memberCronjobKey(service, userId);
  if (!key) return false;
  const url = memberDispatchUrl();
  await setDispatchJobEnabled(key, url, false);
  await service.from(SCHEDULER_TABLE).update({ active: false, updated_at: now() }).eq("user_id", userId);
  if ((await remainingScheduled(service, userId)) > 0) {
    await setDispatchJobEnabled(key, url, true);
    await service.from(SCHEDULER_TABLE).update({ active: true, updated_at: now() }).eq("user_id", userId);
    return false;
  }
  return true;
}

/** 실행 방식 바꾸기. cronjob으로 바꾸면 키가 있어야 하고 켜진 정기 작업이 있으면 작업을 켠다. vercel로 바꾸면 회원 작업을 끈다. */
export async function setMemberSchedulerMode(service: SupabaseClient, userId: string, mode: SchedulerMode): Promise<void> {
  await ensureRow(service, userId);
  const key = await memberCronjobKey(service, userId);
  if (mode === "cronjob") {
    if (!key) throw new Error("cron-job.org로 실행하려면 아래 칸에 본인 cron-job.org API 키를 먼저 저장해 주세요.");
    const previousMode = await memberSchedulerMode(service, userId);
    await service.from(SCHEDULER_TABLE).update({ mode: "cronjob", updated_at: now() }).eq("user_id", userId);
    if ((await remainingScheduled(service, userId)) > 0) {
      try {
        await ensureMemberSchedulerRunning(service, userId, key);
      } catch (error) {
        // 2026-10-20: cron-job.org 작업을 켜지 못하면 이전 방식으로 되돌린다 — cronjob으로 남으면 운영자 실행에서도 빠져 예약이 멈춘다.
        await service.from(SCHEDULER_TABLE).update({ mode: previousMode, active: false, updated_at: now() }).eq("user_id", userId);
        throw error;
      }
    }
    return;
  }
  if (!platformSchedulerEnabled()) throw new Error("이 사이트는 Vercel 예약 호출이 꺼져 있어 「내 cron-job.org」 방식만 쓸 수 있습니다.");
  if (key) { try { await setDispatchJobEnabled(key, memberDispatchUrl(), false); } catch { /* 키가 무효여도 방식 변경은 진행 */ } }
  await service.from(SCHEDULER_TABLE).update({ mode: "vercel", active: false, updated_at: now() }).eq("user_id", userId);
}

export async function pauseMemberScheduler(service: SupabaseClient, userId: string): Promise<{ jobStopped: boolean }> {
  await ensureRow(service, userId);
  // 2026-10-20: 일시정지를 먼저 저장한다 — cron-job.org 끄기가 실패해도(하루 한도 등) 회원 실행 주소가 일시정지 회원을 건너뛰므로(skipPausedMember) 발송되지 않는다.
  await service.from(SCHEDULER_TABLE).update({ active: false, paused: true, updated_at: now() }).eq("user_id", userId);
  const key = await memberCronjobKey(service, userId);
  if (!key || (await memberSchedulerMode(service, userId)) !== "cronjob") return { jobStopped: true };
  try {
    await setDispatchJobEnabled(key, memberDispatchUrl(), false);
    return { jobStopped: true };
  } catch (error) {
    console.error("[pauseMemberScheduler] cron-job.org 작업 끄기 실패 — 다음 회원 실행 때 다시 시도", error instanceof Error ? error.message : error);
    return { jobStopped: false };
  }
}

/** 회원 실행 주소용: 일시정지된 회원이면 true(실행하지 않음). 일시정지 때 작업 끄기에 실패했을 수 있으니 여기서 다시 끈다. */
export async function skipPausedMember(service: SupabaseClient, userId: string): Promise<boolean> {
  if (!(await schedulerRow(service, userId))?.paused) return false;
  const key = await memberCronjobKey(service, userId);
  if (key) await setDispatchJobEnabled(key, memberDispatchUrl(), false).catch(() => undefined);
  return true;
}

export async function resumeMemberScheduler(service: SupabaseClient, userId: string): Promise<{ started: boolean }> {
  await service.from(SCHEDULER_TABLE).update({ paused: false, updated_at: now() }).eq("user_id", userId);
  if ((await memberSchedulerMode(service, userId)) === "vercel") return { started: platformSchedulerEnabled() };
  const key = await memberCronjobKey(service, userId);
  if (!key || (await remainingScheduled(service, userId)) === 0) return { started: false };
  try {
    await ensureMemberSchedulerRunning(service, userId, key);
  } catch (error) {
    // 2026-10-20: 작업을 켜지 못하면 일시정지 상태로 되돌린다 — 화면(일시정지됨)과 DB가 어긋나지 않게.
    await service.from(SCHEDULER_TABLE).update({ paused: true, active: false, updated_at: now() }).eq("user_id", userId);
    throw error;
  }
  return { started: true };
}

/**
 * cron-job.org 키를 지우거나 바꿀 때: 회원 작업을 지우고 토큰을 무효로 한다. 지울 때는 cronjob 방식이던 회원을 기본(vercel)으로 되돌린다(바꿀 때는 keepMode)
 * (Vercel을 못 쓰는 사이트면 방식은 그대로 두고 키를 다시 등록해야 예약이 돈다). 일시정지 상태는 유지.
 */
export async function removeMemberScheduler(service: SupabaseClient, userId: string, options: { keepMode?: boolean } = {}): Promise<void> {
  const key = await memberCronjobKey(service, userId);
  if (key) {
    try { await deleteDispatchJob(key, memberDispatchUrl()); } catch { /* 키가 이미 무효일 수 있음 — 연결 정보만 정리 */ }
  }
  const row = await schedulerRow(service, userId);
  if (!row) return;
  await service.from(SCHEDULER_TABLE).update({
    token_hash: `unset-${userId}`, cronjob_job_id: null, active: false,
    mode: !options.keepMode && platformSchedulerEnabled() ? "vercel" : row.mode, updated_at: now(),
  }).eq("user_id", userId);
}

export type MemberSchedulerState = {
  mode: SchedulerMode;
  defaultMode: SchedulerMode;
  platformAvailable: boolean;
  hasKey: boolean;
  state: "platform" | "platform-off" | "no-key" | "paused" | "running" | "idle";
  scheduled: number;
};

/** 화면 표시용(cron-job.org를 부르지 않고 DB만 본다) */
export async function memberSchedulerState(service: SupabaseClient, userId: string): Promise<MemberSchedulerState> {
  const [key, row, scheduled] = await Promise.all([memberCronjobKey(service, userId), schedulerRow(service, userId), remainingScheduled(service, userId)]);
  const mode: SchedulerMode = row?.mode ?? DEFAULT_SCHEDULER_MODE;
  const platformAvailable = platformSchedulerEnabled();
  const base = { mode, defaultMode: DEFAULT_SCHEDULER_MODE, platformAvailable, hasKey: Boolean(key), scheduled };
  if (row?.paused) return { ...base, state: "paused" };
  if (mode === "vercel") return { ...base, state: platformAvailable ? "platform" : "platform-off" };
  if (!key) return { ...base, state: "no-key" };
  return { ...base, state: row?.active ? "running" : "idle" };
}
