import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isInRetentionGrace, retentionCutoff, RETENTION_DAYS, RETENTION_GRACE_END } from "@/lib/retention";
import { exemptInFilter, loadRetentionExemptIds } from "@/lib/retentionExempt";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

const REPORTS_PER_RUN = 500;
const SEND_LOGS_PER_RUN = 2000;
const LIST_LIMIT = 1000;
const BUCKET = "kakao-report-images";

// generate-reports와 같은 CRON_SECRET Bearer 인증. 비어 있으면 통과시키지 않는다.
function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

// 타입 파일에 없는 칼럼(profiles.retention_exempt)·표를 다루므로 느슨한 타입으로 쓴다.
type Admin = any; // eslint-disable-line @typescript-eslint/no-explicit-any

async function removePaths(admin: Admin, paths: string[]) {
  for (let i = 0; i < paths.length; i += 100) {
    const { error } = await admin.storage.from(BUCKET).remove(paths.slice(i, i + 100));
    if (error) throw new Error(`파일 삭제 실패: ${error.message}`);
  }
}

/**
 * 2026-11-13 생성 자료 30일 자동 정리. 매일 1회(vercel.json).
 * ① 만든 지 30일 지난 리포트 행을 지운다.
 * ② 회원 폴더(kakao-report-images/<userId>/)의 30일 지난 이미지 파일 중 남은 리포트 본문에서 쓰지 않는 것을 지운다
 *    (리포트 이미지는 본문 HTML에만 주소로 들어 있어 행을 지운 뒤 파일을 정리한다).
 * ③ 만든 지 30일 지난 발송 기록(kakao_broadcast_send_log)을 지운다.
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
  let reportsDeleted = 0;
  let imagesDeleted = 0;
  let sendLogsDeleted = 0;

  // ① 만료 리포트
  try {
    let q = admin.from("kakao_reports").select("id").lt("created_at", cutoff);
    if (exemptFilter) q = q.not("user_id", "in", exemptFilter);
    const { data, error } = await q.limit(REPORTS_PER_RUN);
    if (error) throw new Error(`kakao_reports: ${error.message}`);
    const ids = (data ?? []).map((r: { id: string }) => r.id);
    for (let i = 0; i < ids.length; i += 100) {
      const { error: delError } = await admin.from("kakao_reports").delete().in("id", ids.slice(i, i + 100));
      if (delError) throw new Error(`kakao_reports 삭제: ${delError.message}`);
      reportsDeleted += Math.min(100, ids.length - i);
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  // ② 30일 지난 이미지 파일(남은 리포트 본문에서 쓰는 파일은 남긴다)
  if (!errors.length) {
    try {
      const { data: folders, error } = await admin.storage.from(BUCKET).list("", { limit: LIST_LIMIT });
      if (error) throw new Error(`목록 실패: ${error.message}`);
      for (const folder of folders ?? []) {
        if (folder.id) continue; // 루트에 바로 놓인 파일은 이 앱이 만들지 않는다
        const userId = folder.name;
        if (exempt.has(userId)) continue; // 예외 회원 폴더
        const { data: files, error: listError } = await admin.storage.from(BUCKET).list(userId, { limit: LIST_LIMIT });
        if (listError) throw new Error(`목록 실패(${userId}): ${listError.message}`);
        const oldFiles = (files ?? []).filter(
          (f: { id: string | null; created_at?: string }) => f.id && f.created_at && f.created_at < cutoff,
        );
        if (!oldFiles.length) continue;
        const { data: live, error: liveError } = await admin
          .from("kakao_reports")
          .select("content")
          .eq("user_id", userId);
        if (liveError) throw new Error(`kakao_reports: ${liveError.message}`);
        const contents = (live ?? []).map((r: { content: string | null }) => r.content ?? "").join("\n");
        const stale = oldFiles
          .map((f: { name: string }) => `${userId}/${f.name}`)
          .filter((path: string) => !contents.includes(path));
        await removePaths(admin, stale);
        imagesDeleted += stale.length;
      }
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  // ③ 만료 발송 기록
  try {
    let q = admin.from("kakao_broadcast_send_log").select("id").lt("created_at", cutoff);
    if (exemptFilter) q = q.not("user_id", "in", exemptFilter);
    const { data, error } = await q.limit(SEND_LOGS_PER_RUN);
    if (error) throw new Error(`kakao_broadcast_send_log: ${error.message}`);
    const ids = (data ?? []).map((r: { id: string }) => r.id);
    for (let i = 0; i < ids.length; i += 200) {
      const { error: delError } = await admin.from("kakao_broadcast_send_log").delete().in("id", ids.slice(i, i + 200));
      if (delError) throw new Error(`kakao_broadcast_send_log 삭제: ${delError.message}`);
      sendLogsDeleted += Math.min(200, ids.length - i);
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  const result = { cutoff, retentionDays: RETENTION_DAYS, reportsDeleted, imagesDeleted, sendLogsDeleted };
  console.log("[cleanup-generated]", JSON.stringify(result), errors.length ? `errors=${errors.length}` : "");
  if (errors.length) return NextResponse.json({ ...result, errors }, { status: 500 });
  return NextResponse.json(result);
}
