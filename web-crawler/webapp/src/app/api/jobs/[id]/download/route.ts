import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkProgramAccessApi } from "@/lib/access";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 2026-10-23 v1.10: 결과 버킷(web-crawler-results)을 비공개로 바꾸고, 「엑셀 다운로드」는 이 주소가
// 본인 작업인지 확인한 뒤 10분짜리 임시 주소로 넘긴다(공개 주소가 밖으로 새도 계속 열리던 문제 #9).
// 파일 경로는 service/pipeline.py `_upload_result`와 같은 `${user_id}/${job_id}.xlsx`.
const RESULT_BUCKET = "web-crawler-results";
const SIGNED_URL_SECONDS = 600;
const RETENTION_DAYS = 30;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });

  const { id } = await params;
  const supabase = await createClient();
  const { data: job } = await supabase
    .from("web_crawler_jobs")
    .select("id, user_id, status, created_at")
    .eq("id", id)
    .eq("user_id", access.user.id)
    .maybeSingle();

  if (!job) return NextResponse.json({ error: "작업을 찾을 수 없습니다." }, { status: 404 });
  if (job.status !== "completed") return NextResponse.json({ error: "아직 완료되지 않은 작업입니다." }, { status: 409 });
  if (Date.parse(job.created_at) < Date.now() - RETENTION_DAYS * 86400000) {
    return NextResponse.json({ error: "30일 보관 기간이 지나 결과 파일이 삭제되었습니다." }, { status: 410 });
  }

  const { data, error } = await createAdminClient()
    .storage.from(RESULT_BUCKET)
    .createSignedUrl(`${job.user_id}/${job.id}.xlsx`, SIGNED_URL_SECONDS, { download: `크롤링결과_${job.id.slice(0, 8)}.xlsx` });
  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "결과 파일을 찾지 못했습니다. 잠시 뒤 다시 시도해 주세요." }, { status: 404 });
  }
  return NextResponse.redirect(data.signedUrl, 302);
}
