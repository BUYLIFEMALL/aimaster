import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkProgramAccessApi } from "@/lib/access";
import { parseXlsxPreview, PREVIEW_LIMITS, XlsxPreviewError } from "@/lib/jobs/xlsxPreview";
import { checkResultRetention } from "@/lib/jobs/resultRetention";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 2026-11-18 T-07: 완료된 수집 엑셀의 앞부분을 표로 미리 보여 준다.
// 본인 확인·보관 기간·파일 경로는 「엑셀 다운로드」(../download/route.ts)와 같다(보관 판정은 공용 resultRetention).
// 회원 본인 행(RLS + user_id)만 찾고, 서버 키는 본인 profiles 1행과 그 회원 폴더의 그 파일 하나를 읽는 데만 쓴다. AI 호출 없음.
// 오류는 고정 문구·고정 코드만 돌려주고 로그에도 원문·stack을 남기지 않는다(F03).
const RESULT_BUCKET = "web-crawler-results";
const NO_STORE = { "Cache-Control": "no-store" };

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

  if (!job) return NextResponse.json({ error: "작업을 찾을 수 없습니다." }, { status: 404, headers: NO_STORE });
  if (job.status !== "completed") return NextResponse.json({ error: "아직 완료되지 않은 작업입니다." }, { status: 409, headers: NO_STORE });

  const admin = createAdminClient();
  const retention = await checkResultRetention(admin, job.user_id, job.created_at);
  if (!retention.ok) return NextResponse.json({ error: retention.error }, { status: retention.status, headers: NO_STORE });

  const { data: blob, error } = await admin.storage.from(RESULT_BUCKET).download(`${job.user_id}/${job.id}.xlsx`);
  if (error || !blob) {
    return NextResponse.json({ error: "결과 파일을 찾지 못했습니다. 잠시 뒤 다시 시도해 주세요." }, { status: 404, headers: NO_STORE });
  }
  if (blob.size > PREVIEW_LIMITS.fileBytes) {
    return NextResponse.json({ error: "결과 파일이 커서 미리보기를 만들 수 없습니다. 엑셀로 내려받아 확인해 주세요." }, { status: 413, headers: NO_STORE });
  }

  try {
    const preview = await parseXlsxPreview(new Uint8Array(await blob.arrayBuffer()));
    return NextResponse.json(preview, { headers: NO_STORE });
  } catch (err) {
    if (err instanceof XlsxPreviewError) {
      return NextResponse.json({ error: err.message }, { status: err.code === "too_large" ? 413 : 422, headers: NO_STORE });
    }
    console.error("[web-crawler] job_preview_failed"); // 고정 코드만 — 원문·stack 미기록
    return NextResponse.json({ error: "미리보기를 만들지 못했습니다. 엑셀로 내려받아 확인해 주세요." }, { status: 500, headers: NO_STORE });
  }
}
