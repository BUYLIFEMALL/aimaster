import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchCampaign } from "@/lib/dispatch";
import { isCampaignDue } from "@/lib/schedule";
import { checkProgramAccess } from "@/lib/programAccess";

// 캠페인 정기 발송 — 운영자 Vercel 호출(/api/cron/dispatch)과 회원 cron-job.org 호출(/api/cron/dispatch-member)이 같이 쓴다(v1.21).
// 캠페인마다 정한 발송 시각(send_hour, KST)·반복(한 번/매일/매주)으로 차례를 판단한다(lib/schedule.ts). 지침: 루트 docs/SCHEDULER_POLICY.md

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
  /** 이 회원의 캠페인만(회원 cron-job.org 실행) */
  userId?: string;
  /** 운영자(Vercel) 실행에서 제외할 회원: cron-job.org를 고른 회원·일시정지 회원 */
  excludeUserIds?: string[];
  /** Vercel 방식이 꺼진 사이트면 운영자 실행은 발송하지 않는다 */
  skipAll?: boolean;
}

export async function dispatchDueCampaigns(options: DispatchOptions = {}) {
  const admin = createAdminClient();
  const now = new Date();

  let query = admin
    .from("stepmail_campaigns")
    .select("id, user_id, draft_id, target_send_count, quantity_per_run, send_hour, recurrence, weekly_day, last_run_at, is_active")
    .eq("is_active", true);
  if (options.userId) query = query.eq("user_id", options.userId);
  if (options.excludeUserIds?.length) query = query.not("user_id", "in", `(${options.excludeUserIds.join(",")})`);
  const { data: campaigns, error } = await query;

  if (error) throw new Error(error.message);
  if (options.skipAll) return { processed: 0, summary: [] };

  // 정지된 계정은 자동 발송 대상에서 제외한다. profiles는 AIMaster 공용 테이블이라 이
  // 서브프로젝트의 Database 타입에는 없다(music/lib/access.ts와 동일하게 느슨한 타입으로 조회).
  const candidateUserIds = Array.from(new Set((campaigns ?? []).map((c) => c.user_id)));
  const adminLoose = admin as unknown as { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data: suspendedProfiles } = await adminLoose
    .from("profiles")
    .select("id")
    .in("id", candidateUserIds.length > 0 ? candidateUserIds : [""])
    .eq("is_suspended", true);
  const suspendedUserIds = new Set((suspendedProfiles ?? []).map((p: { id: string }) => p.id));

  // 핸드폰 번호 필수 정책(2026-10-12): 번호가 없는 회원(관리자 제외)의 캠페인은 발송하지 않는다.
  const phoneOkUsers = await phoneRegisteredUserIds(adminLoose, candidateUserIds);
  const dueCampaigns = (campaigns ?? []).filter((c) => !suspendedUserIds.has(c.user_id) && phoneOkUsers.has(c.user_id) && isCampaignDue(c, now));

  // 프로그램 이용 권한(v1.21): 사용기간이 끝난 회원의 켜 둔 캠페인은 발송하지 않는다(회원별 1회 확인).
  const accessCache = new Map<string, boolean>();
  const hasAccess = async (userId: string) => {
    if (!accessCache.has(userId)) accessCache.set(userId, (await checkProgramAccess(adminLoose, userId, "stepmail")).allowed);
    return accessCache.get(userId)!;
  };

  const summary: { campaignId: string; sentCount: number; failedCount: number }[] = [];

  for (const campaign of dueCampaigns) {
    if (!(await hasAccess(campaign.user_id))) continue;
    // 중복 발송 방지(v1.21): 운영자 호출·회원 호출이 겹쳐도 last_run_at을 「먼저 바꾼」 실행만 발송한다(조건부 update).
    let claim = admin.from("stepmail_campaigns").update({ last_run_at: now.toISOString() }).eq("id", campaign.id);
    claim = campaign.last_run_at ? claim.eq("last_run_at", campaign.last_run_at) : claim.is("last_run_at", null);
    const { data: claimed } = await claim.select("id").maybeSingle();
    if (!claimed) continue;
    try {
      const result = await dispatchCampaign(admin, campaign);
      summary.push({ campaignId: campaign.id, sentCount: result.sentCount, failedCount: result.failedCount });
    } catch (err) {
      // 발송 도중 예외가 나도 선점(last_run_at)은 되돌리지 않는다 — 일부 메일이 이미 나갔을 수 있어 다시 보내면 중복 발송된다.
      // (예전 동작도 예외 시 그 시간대에 다시 보내지 않았다) 이 캠페인만 건너뛰고 다른 캠페인은 계속 처리한다.
      console.error(`[stepmail dispatch] campaign ${campaign.id} 실패:`, err);
    }
  }

  return { processed: summary.length, summary };
}
