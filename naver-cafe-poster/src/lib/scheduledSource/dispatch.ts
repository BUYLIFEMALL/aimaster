import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { isScheduleDue } from "@/lib/schedule";
import { runScheduledSource } from "@/lib/scheduledSource/engine";
import type { ScheduledSource } from "@/types/post";
import { checkProgramAccess } from "@/lib/programAccess";

// 정기 자동 실행(생성+포스팅) — 운영자 Vercel 호출(/api/cron/generate-and-post)과 회원 cron-job.org 호출(/api/cron/dispatch-member)이 같이 쓴다(v1.21).
// 지침: 루트 docs/SCHEDULER_POLICY.md. 실행할 차례인지는 last_run_at 기준으로 판단한다(kakao_auto_poster의 generate-reports와 같은 패턴).

/** 핸드폰 번호 필수 정책(2026-10-12): 번호가 없는 회원(관리자 제외)의 예약·자동 작업은 실행하지 않는다. 루트 lib/utils/phone.ts 와 같은 규칙. */
async function phoneRegisteredUserIds(client: unknown, userIds: string[]): Promise<Set<string>> {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  if (ids.length === 0) return new Set();
  const { data } = await (client as { from: (t: string) => any }).from("profiles").select("id, is_admin, phone").in("id", ids); // eslint-disable-line @typescript-eslint/no-explicit-any
  return new Set(
    ((data ?? []) as { id: string; is_admin: boolean | null; phone: string | null }[])
      .filter((p) => p.is_admin || /^01[016789]\d{7,8}$/.test(String(p.phone ?? "").replace(/[^0-9]/g, "")))
      .map((p) => p.id)
  );
}

/** 프로그램 이용 권한(정지·핸드폰·FREE·구독·등급+사용기간) — 실행 직전 회원별 1회 확인(v1.22). 사용기간이 끝난 회원의 켜 둔 정기 실행은 돌리지 않는다. */
const NO_ACCESS_MESSAGE = "프로그램 이용 기간이 끝났거나 이용 권한이 확인되지 않아 정기 실행을 하지 않았습니다. 이용 기간을 연장한 뒤 다시 돌아갑니다.";
function accessChecker(admin: unknown, slug: string) {
  const cache = new Map<string, boolean>();
  return async (userId: string) => {
    if (!cache.has(userId)) cache.set(userId, (await checkProgramAccess(admin as Parameters<typeof checkProgramAccess>[0], userId, slug)).allowed);
    return cache.get(userId)!;
  };
}

export interface DispatchOptions {
  /** 이 회원의 소스만(회원 cron-job.org 실행) */
  userId?: string;
  /** 운영자(Vercel) 실행에서 제외할 회원: cron-job.org를 고른 회원·일시정지 회원 */
  excludeUserIds?: string[];
  /** Vercel 방식이 꺼진 사이트에서 운영자 실행이 Vercel 회원 소스를 만나면 실행하지 않고 이 안내를 남긴다 */
  failWithMessage?: string;
}

export async function dispatchDueSources(options: DispatchOptions = {}) {
  const admin = createAdminClient();
  const now = new Date();

  let query = admin.from("ncafe_scheduled_sources").select("*").eq("is_active", true).eq("schedule_enabled", true);
  if (options.userId) query = query.eq("user_id", options.userId);
  if (options.excludeUserIds?.length) query = query.not("user_id", "in", `(${options.excludeUserIds.join(",")})`);
  const { data: rows, error } = await query;
  if (error) throw new Error(error.message);

  const dueRows = ((rows ?? []) as ScheduledSource[]).filter(
    (r) => r.interval_minutes != null && isScheduleDue(r.last_run_at, r.interval_minutes, now),
  );

  let succeeded = 0;
  let failed = 0;
  const details: { sourceId: string; result: string }[] = [];

  const phoneOkUsers = await phoneRegisteredUserIds(admin, dueRows.map((r) => r.user_id));
  const hasAccess = accessChecker(admin, "naver-cafe-poster");
  for (const source of dueRows.filter((r) => phoneOkUsers.has(r.user_id))) {
    if (options.failWithMessage) {
      await admin.from("ncafe_scheduled_sources").update({ last_error: options.failWithMessage }).eq("id", source.id);
      failed += 1;
      details.push({ sourceId: source.id, result: `skipped: ${options.failWithMessage}` });
      continue;
    }
    if (!(await hasAccess(source.user_id))) {
      await admin.from("ncafe_scheduled_sources").update({ last_error: NO_ACCESS_MESSAGE }).eq("id", source.id);
      failed += 1;
      details.push({ sourceId: source.id, result: "skipped: no program access" });
      continue;
    }
    // 중복 실행 방지(v1.21): 운영자 호출·회원 호출이 겹쳐도 last_run_at을 「먼저 바꾼」 실행만 진행한다(조건부 update).
    const claimedAt = new Date().toISOString();
    let claim = admin.from("ncafe_scheduled_sources").update({ last_run_at: claimedAt }).eq("id", source.id);
    claim = source.last_run_at ? claim.eq("last_run_at", source.last_run_at) : claim.is("last_run_at", null);
    const { data: claimed } = await claim.select("id").maybeSingle();
    if (!claimed) continue;

    const result = await runScheduledSource(admin, source.user_id, source);
    if (result.success) {
      succeeded += 1;
      details.push({ sourceId: source.id, result: `post ${result.postId} created` });
    } else {
      failed += 1;
      details.push({ sourceId: source.id, result: `failed: ${result.error}` });
      console.error(`[naver-cafe-poster dispatch] source ${source.id} 실행 실패:`, result.error);
      // 일시 오류는 예전처럼 다음 깨움(5분)에 바로 다시 시도하도록 선점 값을 원래대로 돌린다.
      // (후보 없음 오류는 엔진이 last_run_at을 새 시각으로 바꿔 주기를 따르게 하므로 그대로 둔다)
      await admin.from("ncafe_scheduled_sources").update({ last_run_at: source.last_run_at }).eq("id", source.id).eq("last_run_at", claimedAt);
    }
  }

  return { total: rows?.length ?? 0, due: dueRows.length, succeeded, failed, details };
}
