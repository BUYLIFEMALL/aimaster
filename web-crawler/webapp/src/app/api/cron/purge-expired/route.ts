import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;

// 생성 데이터 30일 자동 삭제 (최상위 규칙, 2026-10-17 주인님 승인).
// Vercel Cron이 매일 1번 호출한다(vercel.json). 결과 엑셀은 Storage에 있고 Storage는 SQL로 직접
// 지울 수 없게 보호돼 있어서, Storage API로 파일을 먼저 지운 뒤 작업 기록(web_crawler_jobs)을 지운다.
// 파일 경로는 service/pipeline.py `_upload_result`와 같은 `${user_id}/${job_id}.xlsx`.
const RESULT_BUCKET = "web-crawler-results";
const RETENTION_DAYS = 30;
const BATCH = 500;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  return !!secret && request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: rows, error } = await admin
    .from("web_crawler_jobs")
    .select("id, user_id")
    .lt("created_at", cutoff)
    .limit(BATCH);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!rows || rows.length === 0) {
    return NextResponse.json({ deletedJobs: 0, deletedFiles: 0 });
  }

  const paths = rows.map((row) => `${row.user_id}/${row.id}.xlsx`);
  const { data: removed, error: storageError } = await admin.storage.from(RESULT_BUCKET).remove(paths);
  if (storageError) {
    // 파일을 못 지웠으면 기록도 남겨 둔다 — 다음 실행에서 다시 시도한다(파일만 남는 일을 막음).
    return NextResponse.json({ error: storageError.message }, { status: 500 });
  }

  const { error: deleteError } = await admin
    .from("web_crawler_jobs")
    .delete()
    .in(
      "id",
      rows.map((row) => row.id),
    );
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ deletedJobs: rows.length, deletedFiles: removed?.length ?? 0 });
}
