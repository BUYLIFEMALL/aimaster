import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isInRetentionGrace, retentionCutoff, RETENTION_DAYS, RETENTION_GRACE_END } from "@/lib/retention";
import { exemptInFilter, loadRetentionExemptIds } from "@/lib/retentionExempt";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

const SEND_LOGS_PER_RUN = 5000;
const DRAFTS_PER_RUN = 500;
const LIST_LIMIT = 1000;
const BUCKET = "stepmail-images"; // 이 프로그램만 쓰는 버킷(<userId>/파일, <userId>/editor/파일)

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

// 타입 파일에 없는 칼럼(profiles.retention_exempt)을 다루므로 느슨한 타입으로 쓴다.
type Admin = any; // eslint-disable-line @typescript-eslint/no-explicit-any
type Entry = { id: string | null; name: string; created_at?: string };

async function listEntries(admin: Admin, prefix: string): Promise<Entry[]> {
  const { data, error } = await admin.storage.from(BUCKET).list(prefix, { limit: LIST_LIMIT });
  if (error) throw new Error(`목록 실패(${prefix}): ${error.message}`);
  return data ?? [];
}

/**
 * 2026-11-13 생성 자료 30일 자동 정리. 매일 1회(vercel.json).
 * ① 30일 지난 발송 기록(stepmail_send_log, sent_at 기준)을 지운다.
 * ② 만든 지 30일 지난 이메일 초안(stepmail_email_drafts) 중 어떤 캠페인도 쓰지 않는 것을 지운다
 *    (캠페인은 draft_id on delete cascade라, 캠페인이 쓰는 초안을 지우면 회원 캠페인 설정까지 사라진다).
 * ③ 회원 폴더의 30일 지난 이미지 파일 중 남은 초안(image_url·본문)에서 쓰지 않는 것을 지운다.
 * 대상 아님: 리드(stepmail_leads — 회원이 직접 올려 관리하는 연락처 명부. 2026-11-14 주인님 결정: 예외로 삭제하지 않고 회원별로 보관, 발송 기록만 30일), 캠페인 설정, 발송 계정, 키.
 * 예외 회원(profiles.retention_exempt)은 지우지 않는다. 로그·응답에는 개수만 남긴다.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (isInRetentionGrace()) {
    return NextResponse.json({ skipped: "grace", graceEnd: RETENTION_GRACE_END, retentionDays: RETENTION_DAYS });
  }

  const admin: Admin = createAdminClient();
  const cutoff = retentionCutoff();
  let exempt: Set<string>;
  try {
    exempt = await loadRetentionExemptIds(admin);
  } catch {
    return NextResponse.json({ error: "자동 삭제 예외 회원 목록을 읽지 못해 정리를 멈췄습니다." }, { status: 503 });
  }
  const exemptFilter = exemptInFilter(exempt);
  const errors: string[] = [];
  let sendLogsDeleted = 0;
  let draftsDeleted = 0;
  let imagesDeleted = 0;

  // ① 발송 기록
  try {
    let q = admin.from("stepmail_send_log").select("id").lt("sent_at", cutoff);
    if (exemptFilter) q = q.not("user_id", "in", exemptFilter);
    const { data, error } = await q.limit(SEND_LOGS_PER_RUN);
    if (error) throw new Error(`stepmail_send_log: ${error.message}`);
    const ids = (data ?? []).map((r: { id: string }) => r.id);
    for (let i = 0; i < ids.length; i += 200) {
      const { error: delError } = await admin.from("stepmail_send_log").delete().in("id", ids.slice(i, i + 200));
      if (delError) throw new Error(`stepmail_send_log 삭제: ${delError.message}`);
      sendLogsDeleted += Math.min(200, ids.length - i);
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  // ② 캠페인이 쓰지 않는 만료 초안
  try {
    let q = admin.from("stepmail_email_drafts").select("id").lt("created_at", cutoff);
    if (exemptFilter) q = q.not("user_id", "in", exemptFilter);
    const { data, error } = await q.limit(DRAFTS_PER_RUN);
    if (error) throw new Error(`stepmail_email_drafts: ${error.message}`);
    const candidateIds = (data ?? []).map((r: { id: string }) => r.id);
    for (let i = 0; i < candidateIds.length; i += 100) {
      const chunk = candidateIds.slice(i, i + 100);
      const { data: used, error: usedError } = await admin
        .from("stepmail_campaigns")
        .select("draft_id")
        .in("draft_id", chunk);
      if (usedError) throw new Error(`stepmail_campaigns: ${usedError.message}`);
      const usedIds = new Set((used ?? []).map((c: { draft_id: string | null }) => c.draft_id));
      const deletable = chunk.filter((id: string) => !usedIds.has(id));
      if (!deletable.length) continue;
      const { error: delError } = await admin.from("stepmail_email_drafts").delete().in("id", deletable);
      if (delError) throw new Error(`stepmail_email_drafts 삭제: ${delError.message}`);
      draftsDeleted += deletable.length;
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  // ③ 남은 초안이 쓰지 않는 30일 지난 이미지 파일(초안 삭제가 실패했으면 건너뜀)
  if (!errors.length) {
    try {
      for (const folder of await listEntries(admin, "")) {
        if (folder.id) continue; // 루트에 바로 놓인 파일은 이 앱이 만들지 않는다
        const userId = folder.name;
        if (exempt.has(userId)) continue; // 예외 회원 폴더
        const old: string[] = [];
        for (const e of await listEntries(admin, userId)) {
          if (e.id) {
            if (e.created_at && e.created_at < cutoff) old.push(`${userId}/${e.name}`);
          } else {
            for (const f of await listEntries(admin, `${userId}/${e.name}`)) {
              if (f.id && f.created_at && f.created_at < cutoff) old.push(`${userId}/${e.name}/${f.name}`);
            }
          }
        }
        if (!old.length) continue;
        const { data: drafts, error: draftError } = await admin
          .from("stepmail_email_drafts")
          .select("image_url, body_html")
          .eq("user_id", userId);
        if (draftError) throw new Error(`stepmail_email_drafts: ${draftError.message}`);
        const used = (drafts ?? [])
          .map((d: { image_url: string | null; body_html: string | null }) => `${d.image_url ?? ""}\n${d.body_html ?? ""}`)
          .join("\n");
        const stale = old.filter((path) => !used.includes(path));
        for (let i = 0; i < stale.length; i += 100) {
          const { error: rmError } = await admin.storage.from(BUCKET).remove(stale.slice(i, i + 100));
          if (rmError) throw new Error(`파일 삭제 실패: ${rmError.message}`);
        }
        imagesDeleted += stale.length;
      }
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  const result = { cutoff, retentionDays: RETENTION_DAYS, sendLogsDeleted, draftsDeleted, imagesDeleted };
  console.log("[cleanup-generated]", JSON.stringify(result), errors.length ? `errors=${errors.length}` : "");
  if (errors.length) return NextResponse.json({ ...result, errors }, { status: 500 });
  return NextResponse.json(result);
}
