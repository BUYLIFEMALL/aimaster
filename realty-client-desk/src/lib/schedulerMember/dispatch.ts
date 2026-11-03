import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSms, type SolapiAccountCredentials } from "@/lib/solapi/client";
import { programAccessUserIds } from "@/lib/accessBatch";
import { isDue, reminderText } from "@/lib/desk/eventRules";

// 3단계(2026-11-03, v1.04): 일정 알림 — 운영자 Vercel 호출(/api/cron/daily)과 회원 cron-job.org 호출(/api/cron/dispatch-member)이 같이 쓴다(booking-reminder와 같은 구조).
// 회원마다 오늘 알릴 일정을 모아 회원 본인 SOLAPI로 회원 본인 핸드폰에 한 통 보낸다(고객에게 보내지 않음, 광고 아님).
// 알리기 전에 notified_at을 먼저 채워 자리를 잡는다(겹친 실행으로 두 번 안 감). 보내기 실패면 되돌려 다음 날 다시 시도.
type SupabaseLike = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any
const PROGRAM_SLUG = "realty-client-desk";

export interface DispatchOptions {
  userId?: string;
  excludeUserIds?: string[];
  skipAll?: boolean;
}

export async function dispatchDueEvents(options: DispatchOptions = {}) {
  const admin = createAdminClient() as unknown as SupabaseLike;
  const nowIso = new Date(Date.now() - 86_400_000).toISOString();
  let q = admin.from("realty_desk_events").select("id, user_id, client_id, kind, title, event_at, notify_days, notified_at, done").eq("done", false).is("notified_at", null).gte("event_at", nowIso).limit(5000);
  if (options.userId) q = q.eq("user_id", options.userId);
  if (options.excludeUserIds?.length) q = q.not("user_id", "in", `(${options.excludeUserIds.join(",")})`);
  const { data: rows, error } = await q;
  if (error) throw new Error(error.message);
  if (options.skipAll) return { members: 0, sent: 0, skipped: [] as string[] };

  const due = (rows ?? []).filter((e: Parameters<typeof isDue>[0]) => isDue(e));
  const byUser = new Map<string, typeof due>();
  for (const e of due) byUser.set(e.user_id, [...(byUser.get(e.user_id) ?? []), e]);
  const userIds = [...byUser.keys()];
  if (!userIds.length) return { members: 0, sent: 0, skipped: [] as string[] };

  const [allowed, { data: profiles }, { data: accounts }] = await Promise.all([
    programAccessUserIds(admin, PROGRAM_SLUG, userIds),
    admin.from("profiles").select("id, is_admin, is_suspended, phone").in("id", userIds),
    admin.from("user_solapi_accounts").select("user_id, api_key, api_secret, sender_phone, kakao_pf_id, rcs_brand_id").in("user_id", userIds),
  ]);
  const profileOf = new Map((profiles ?? []).map((p: { id: string }) => [p.id, p]));
  const accountOf = new Map<string, SolapiAccountCredentials>((accounts ?? []).map((a: SolapiAccountCredentials & { user_id: string }) => [a.user_id, a]));
  const clientIds = due.map((e: { client_id: string | null }) => e.client_id).filter(Boolean);
  const { data: clients } = clientIds.length ? await admin.from("realty_desk_clients").select("id, name").in("id", clientIds) : { data: [] };
  const nameOf = new Map((clients ?? []).map((c: { id: string; name: string }) => [c.id, c.name]));

  let sent = 0;
  const skipped: string[] = [];
  for (const [userId, events] of byUser) {
    const p = profileOf.get(userId) as { is_suspended?: boolean; phone?: string | null } | undefined;
    const phone = String(p?.phone ?? "").replace(/\D/g, "");
    // 핸드폰 번호 필수 정책: 번호가 없는(또는 정지된) 회원의 자동 작업은 실행하지 않는다
    if (!p || p.is_suspended || !/^01[016789]\d{7,8}$/.test(phone)) { skipped.push(`${userId}:no-phone`); continue; }
    if (!allowed.has(userId)) { skipped.push(`${userId}:no-access`); continue; }
    const account = accountOf.get(userId);
    if (!account) { skipped.push(`${userId}:no-solapi`); continue; } // 화면(대시보드·일정)에는 그대로 보임
    const stamp = new Date().toISOString();
    const { data: claimed } = await admin.from("realty_desk_events").update({ notified_at: stamp })
      .in("id", events.map((e: { id: string }) => e.id)).eq("user_id", userId).is("notified_at", null).select("id");
    const claimedIds = new Set((claimed ?? []).map((c: { id: string }) => c.id));
    const mine = events.filter((e: { id: string }) => claimedIds.has(e.id));
    if (!mine.length) continue;
    try {
      await sendSms(account, phone, reminderText(mine.map((e: { kind: string; title: string; event_at: string; client_id: string | null }) => ({ ...e, client_name: e.client_id ? nameOf.get(e.client_id) : null }))));
      sent += 1;
    } catch (err) {
      await admin.from("realty_desk_events").update({ notified_at: null }).in("id", [...claimedIds]).eq("user_id", userId).eq("notified_at", stamp);
      skipped.push(`${userId}:send-failed`);
      console.error("[desk events] 알림 문자 실패", err instanceof Error ? err.message : err);
    }
  }
  return { members: userIds.length, sent, skipped };
}

/** 1년 보관 정리(관리자 지정 2026-11-01, 운영 정리 작업) — 관리자·시험 계정(profiles.retention_exempt)은 빼고 지운다 */
export async function cleanupExpired() {
  const admin = createAdminClient() as unknown as SupabaseLike;
  const cutoff = new Date(Date.now() - 365 * 86_400_000).toISOString();
  const { data: exempt } = await admin.from("profiles").select("id").eq("retention_exempt", true);
  const skip = (exempt ?? []).map((p: { id: string }) => p.id);
  const not = (q: any) => (skip.length ? q.not("user_id", "in", `(${skip.join(",")})`) : q); // eslint-disable-line @typescript-eslint/no-explicit-any
  const counts: Record<string, number> = {};
  for (const [table, col] of [["realty_desk_sends", "created_at"], ["realty_desk_events", "event_at"], ["realty_desk_clients", "last_contact_at"], ["realty_desk_listings", "updated_at"]] as const) {
    const { data, error } = await not(admin.from(table).delete().lt(col, cutoff)).select("id");
    if (error) throw new Error(`${table}: ${error.message}`);
    counts[table] = (data ?? []).length;
  }
  return counts;
}
