import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { runReminderRule } from "@/lib/booking/reminderDispatch";
import { checkProgramAccess } from "@/lib/programAccess";

// 예약 리마인드 발송 — 운영자 Vercel 호출(/api/cron/reminder)과 회원 cron-job.org 호출(/api/cron/dispatch-member)이 같이 쓴다(v1.21).
// 켜진 규칙마다 「예약일시 + offset」이 지난 예약 중 아직 안 보낸 것만 보낸다(lib/booking/reminderDispatch.ts). 지침: 루트 docs/SCHEDULER_POLICY.md

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
  /** 이 회원의 규칙만(회원 cron-job.org 실행) */
  userId?: string;
  /** 운영자(Vercel) 실행에서 제외할 회원: cron-job.org를 고른 회원·일시정지 회원 */
  excludeUserIds?: string[];
  /** Vercel 방식이 꺼진 사이트면 운영자 실행은 보내지 않는다 */
  skipAll?: boolean;
}

export async function dispatchDueReminders(options: DispatchOptions = {}) {
  const admin = createAdminClient();

  let query = admin
    .from("booking_reminder_rules")
    .select(
      "id, user_id, name, offset_minutes, channel_email, channel_sms, channel_alimtalk, channel_friendtalk, message_subject, message_text, kakao_template_id, kakao_variables",
    )
    .eq("is_active", true);
  if (options.userId) query = query.eq("user_id", options.userId);
  if (options.excludeUserIds?.length) query = query.not("user_id", "in", `(${options.excludeUserIds.join(",")})`);
  const { data: rules, error } = await query;
  if (error) throw new Error(error.message);
  if (options.skipAll) return { ruleCount: rules?.length ?? 0, summary: [] };

  const summary: { ruleId: string; ruleName: string; sent: number; failed: number }[] = [];
  const phoneOkUsers = await phoneRegisteredUserIds(admin, (rules ?? []).map((r: { user_id: string }) => r.user_id));
  // 프로그램 이용 권한(v1.21): 사용기간이 끝난 회원의 켜 둔 규칙은 보내지 않는다(회원별 1회 확인).
  const accessCache = new Map<string, boolean>();
  const hasAccess = async (userId: string) => {
    if (!accessCache.has(userId)) accessCache.set(userId, (await checkProgramAccess(admin as unknown as Parameters<typeof checkProgramAccess>[0], userId, "booking-reminder")).allowed);
    return accessCache.get(userId)!;
  };

  for (const rule of (rules ?? []).filter((r: { user_id: string }) => phoneOkUsers.has(r.user_id))) {
    if (!(await hasAccess(rule.user_id))) continue;
    try {
      const result = await runReminderRule({
        ...rule,
        kakao_variables: rule.kakao_variables as Record<string, string>,
      });
      summary.push({ ruleId: rule.id, ruleName: rule.name, ...result });
    } catch (err) {
      summary.push({ ruleId: rule.id, ruleName: rule.name, sent: 0, failed: -1 });
      console.error(`리마인드 규칙 실행 실패 (${rule.id}):`, err);
    }
  }

  return { ruleCount: (rules ?? []).length, summary };
}
