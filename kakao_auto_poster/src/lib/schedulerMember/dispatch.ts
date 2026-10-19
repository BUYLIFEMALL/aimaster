import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentKstHour, isScheduleDue, isWithinActiveHours } from "@/lib/schedule";
import { generateReportForTopic } from "@/lib/reportEngine";

// 정기 자동 생성 — 운영자 Vercel 호출(/api/cron/generate-reports)과 회원 cron-job.org 호출(/api/cron/dispatch-member)이 같이 쓴다(v1.21).
// 주제마다 주기(1시간~매주)와 활동 시간대가 다르므로 last_run_at·KST 시각으로 차례를 판단한다. 카카오 발송은 여기서 하지 않는다 —
// generateReportForTopic 안에서 텔레그램이 연동돼 있으면 검토 요청만 보내고, 발행 여부는 항상 사람이 결정한다. 지침: 루트 docs/SCHEDULER_POLICY.md

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

export interface DispatchOptions {
  /** 이 회원의 주제만(회원 cron-job.org 실행) */
  userId?: string;
  /** 운영자(Vercel) 실행에서 제외할 회원: cron-job.org를 고른 회원·일시정지 회원 */
  excludeUserIds?: string[];
  /** Vercel 방식이 꺼진 사이트에서 운영자 실행이 Vercel 회원 주제를 만나면 생성하지 않는다 */
  failWithMessage?: string;
}

export async function dispatchDueTopics(options: DispatchOptions = {}) {
  const admin = createAdminClient();
  const now = new Date();

  let query = admin
    .from("kakao_topics")
    .select(
      "id, user_id, topic_name, keywords, lookback_days, interval_minutes, last_run_at, active_hour_start, active_hour_end, notify_channels",
    )
    .eq("is_active", true)
    .eq("schedule_enabled", true);
  if (options.userId) query = query.eq("user_id", options.userId);
  if (options.excludeUserIds?.length) query = query.not("user_id", "in", `(${options.excludeUserIds.join(",")})`);
  const { data: rows, error } = await query;

  if (error) throw new Error(error.message);

  const kstHour = currentKstHour(now);
  const dueRows = (rows ?? []).filter(
    (r) =>
      r.interval_minutes != null &&
      isScheduleDue(r.last_run_at, r.interval_minutes, now) &&
      isWithinActiveHours(kstHour, r.active_hour_start, r.active_hour_end),
  );

  let generated = 0;
  let failed = 0;
  const details: { topicId: string; result: string }[] = [];
  if (options.failWithMessage) {
    return { total: rows?.length ?? 0, due: dueRows.length, generated, failed: dueRows.length, details: dueRows.map((r) => ({ topicId: r.id, result: `skipped: ${options.failWithMessage}` })) };
  }

  const phoneOkUsers = await phoneRegisteredUserIds(admin, dueRows.map((r: { user_id: string }) => r.user_id));
  for (const row of dueRows.filter((r: { user_id: string }) => phoneOkUsers.has(r.user_id))) {
    // 중복 생성 방지(v1.21): 운영자 호출·회원 호출이 겹쳐도 last_run_at을 「먼저 바꾼」 실행만 진행한다(조건부 update).
    const claimedAt = now.toISOString();
    let claim = admin.from("kakao_topics").update({ last_run_at: claimedAt }).eq("id", row.id);
    claim = row.last_run_at ? claim.eq("last_run_at", row.last_run_at) : claim.is("last_run_at", null);
    const { data: claimed } = await claim.select("id").maybeSingle();
    if (!claimed) continue;
    try {
      const result = await generateReportForTopic(
        admin,
        row.user_id,
        {
          id: row.id,
          topic_name: row.topic_name,
          keywords: row.keywords,
          lookback_days: row.lookback_days,
          notify_channels: row.notify_channels,
        },
        "scheduled",
      );
      generated++;
      details.push({ topicId: row.id, result: `report ${result.reportId} created` });
    } catch (err) {
      // 본인 API 키가 없거나 검색/생성 실패는 이 주제만 건너뛰고 계속 진행한다 — 다른 회원의 예약 생성을 막지 않는다.
      // 예전처럼 다음 tick에 다시 시도하도록 선점한 last_run_at을 원래대로 돌린다.
      failed++;
      const message = err instanceof Error ? err.message : "unknown error";
      details.push({ topicId: row.id, result: `failed: ${message}` });
      console.error(`[kakao_auto_poster dispatch] topic ${row.id} 생성 실패:`, err);
      await admin.from("kakao_topics").update({ last_run_at: row.last_run_at }).eq("id", row.id).eq("last_run_at", claimedAt);
    }
  }

  return { total: rows?.length ?? 0, due: dueRows.length, generated, failed, details };
}
