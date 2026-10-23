import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMonitoringDue } from "@/lib/schedule";
import { runCommentSync } from "@/lib/comments/sync";
import { checkProgramAccess } from "@/lib/programAccess";

// 예약 댓글 모니터링 — 운영자 Vercel 호출(/api/cron/sync-comments)과 회원 cron-job.org 호출(/api/cron/dispatch-member)이 같이 쓴다(v1.36, youtube-auto-reply v1.12에서 가져옴).
// 5분마다 깨워도 실제 확인은 회원이 고른 monitoring_interval_minutes/last_run_at으로 판단한다(lib/schedule.ts). 지침: 루트 docs/SCHEDULER_POLICY.md
// 자동으로는 「새 댓글 수집 + AI 초안」까지만 — 실제 게시는 회원이 켠 「자동 게시」 또는 사람 승인(AGENTS.md 7번 규칙).

export interface DispatchOptions {
  /** 이 회원만(회원 cron-job.org 실행) */
  userId?: string;
  /** 운영자(Vercel) 실행에서 제외할 회원: cron-job.org를 고른 회원·일시정지 회원 */
  excludeUserIds?: string[];
  /** Vercel 방식이 꺼진 사이트면 운영자 실행은 확인하지 않는다 */
  skipAll?: boolean;
}

export async function dispatchDueMonitoring(options: DispatchOptions = {}) {
  const admin = createAdminClient();
  const now = new Date();

  let query = admin
    .from("ig_settings")
    .select("user_id, monitoring_interval_minutes, monitoring_started_at, last_run_at")
    .eq("monitoring_enabled", true);
  if (options.userId) query = query.eq("user_id", options.userId);
  if (options.excludeUserIds?.length) query = query.not("user_id", "in", `(${options.excludeUserIds.join(",")})`);
  const { data: settingsRows, error } = await query;
  if (error) throw new Error(error.message);
  if (options.skipAll) return { processed: 0, summary: [] };

  const dueRows = (settingsRows ?? []).filter((row) =>
    isMonitoringDue(row.last_run_at, row.monitoring_interval_minutes, now),
  );

  const summary: Array<{ userId: string; newCount?: number; error?: string }> = [];

  // profiles는 이 프로젝트 Database 타입에 없는 루트 공용 테이블이라(lib/access.ts와 동일 이유),
  // from()의 반환값만 느슨하게 받는다.
  const adminLike = admin as unknown as { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

  for (const row of dueRows) {
    // 정지된 계정은 자동 처리 대상에서 제외한다.
    const { data: profile } = await adminLike.from("profiles").select("is_suspended, is_admin, phone").eq("id", row.user_id).maybeSingle();
    if (profile?.is_suspended) continue;
    // 핸드폰 번호 필수 정책(2026-10-12): 번호가 없는 회원(관리자 제외)은 자동 처리에서 제외한다.
    if (!profile?.is_admin && !/^01[016789]\d{7,8}$/.test(String(profile?.phone ?? "").replace(/[^0-9]/g, ""))) continue; // hasMobilePhone
    // 프로그램 이용 권한(v1.36): 사용기간이 끝난 회원의 켜 둔 모니터링은 돌리지 않는다(AI 초안이 회원 키 요금을 쓰므로).
    if (!(await checkProgramAccess(adminLike as Parameters<typeof checkProgramAccess>[0], row.user_id, "instagram-comment-reply")).allowed) continue;

    // 중복 실행 방지(v1.36): 운영자 호출·회원 호출이 겹쳐도 last_run_at을 「먼저 바꾼」 실행만 진행한다(조건부 update).
    let claim = admin.from("ig_settings").update({ last_run_at: now.toISOString() }).eq("user_id", row.user_id);
    claim = row.last_run_at ? claim.eq("last_run_at", row.last_run_at) : claim.is("last_run_at", null);
    const { data: claimed } = await claim.select("user_id").maybeSingle();
    if (!claimed) continue;

    const result = await runCommentSync(admin, row.user_id, row.monitoring_started_at);
    summary.push({ userId: row.user_id, newCount: result.newCount, error: result.error });
  }

  return { processed: summary.length, summary };
}
