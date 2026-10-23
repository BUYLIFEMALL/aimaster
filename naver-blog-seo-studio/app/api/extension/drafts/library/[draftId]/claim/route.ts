import { NextResponse } from "next/server";
import { verifyExtensionToken } from "@/lib/extensionAuth";
import { draftReport, manualInputAllowed } from "@/lib/draftWriteGuard";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(request: Request, context: { params: Promise<{ draftId: string }> }) {
  const user = await verifyExtensionToken(request);
  if (!user) return NextResponse.json({ error: "유효하지 않은 연동 토큰이거나 이용 권한이 없습니다." }, { status: 401 });
  const { draftId } = await context.params;
  const db = createServiceClient();
  const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data: row, error: readError } = await db.from("naver_blog_seo_drafts").select("seo_report")
    .eq("id", draftId).eq("user_id", user.userId).gte("created_at", cutoff).not("extension_handoff_at", "is", null).maybeSingle();
  if (readError) return NextResponse.json({ error: "확장 불러오기 상태 저장에 실패했습니다." }, { status: 500 });
  if (!row) return NextResponse.json({ error: "불러올 수 없는 초안입니다." }, { status: 404 });
  // 2026-10-23: 실패했거나 20분 넘게 멈춘 자동 포스팅 실행이 남은 원고도 「편집기로 입력만」을 위해 불러올 수 있게 한다(입력 결과 API와 같은 기준).
  const run = draftReport(draftReport(row.seo_report).autoPublish);
  if (!manualInputAllowed(run)) return NextResponse.json({ error: "자동 포스팅이 진행 중인 원고입니다. 발행 결과를 먼저 확인해 주세요." }, { status: 409 });
  let update = db.from("naver_blog_seo_drafts")
    .update({ extension_imported_at: new Date().toISOString() })
    .eq("id", draftId).eq("user_id", user.userId).gte("created_at", cutoff).not("extension_handoff_at", "is", null);
  update = run.runId
    ? update.eq("seo_report->autoPublish->>runId", String(run.runId)).eq("seo_report->autoPublish->>state", String(run.state))
    : update.is("seo_report->autoPublish->>runId", null);
  const { data, error } = await update.select("id").maybeSingle();
  if (error) return NextResponse.json({ error: "확장 불러오기 상태 저장에 실패했습니다." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "다른 실행이 먼저 반영됐습니다. 목록을 새로고침해 주세요." }, { status: 409 });
  return NextResponse.json({ ok: true });
}
