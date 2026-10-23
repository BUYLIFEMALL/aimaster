import { NextResponse } from "next/server";
import { verifyExtensionToken } from "@/lib/extensionAuth";
import { draftReport, manualInputAllowed } from "@/lib/draftWriteGuard";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const allowedStatuses = new Set(["in_progress", "completed", "publish_ready", "failed"]);

export async function POST(request: Request, context: { params: Promise<{ draftId: string }> }) {
  const user = await verifyExtensionToken(request);
  if (!user) return NextResponse.json({ error: "유효하지 않은 확장 토큰이거나 이용 권한이 없습니다." }, { status: 401 });
  const { draftId } = await context.params;
  const input = await request.json().catch(() => null) as { status?: string; error?: string; paragraphCount?: number } | null;
  const status = input?.status?.trim() ?? "";
  if (!allowedStatuses.has(status)) return NextResponse.json({ error: "지원하지 않는 입력 상태입니다." }, { status: 400 });
  const error = input?.error?.trim().slice(0, 500) || null;
  const completedAt = status === "completed" || status === "publish_ready" ? new Date().toISOString() : null;
  const db = createServiceClient();
  const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data: row, error: readError } = await db.from("naver_blog_seo_drafts").select("seo_report")
    .eq("id", draftId).eq("user_id", user.userId).gte("created_at", cutoff).not("extension_handoff_at", "is", null).maybeSingle();
  if (readError) return NextResponse.json({ error: "입력 결과 기록에 실패했습니다." }, { status: 500 });
  if (!row) return NextResponse.json({ error: "기록할 수 있는 내 전송 초안을 찾지 못했습니다." }, { status: 404 });
  // 2026-10-23: 실패했거나 20분 넘게 멈춘 자동 포스팅 실행이 남아 있어도 「편집기로 입력만」 결과는 기록한다(읽은 실행과 같을 때만 저장).
  const run = draftReport(draftReport(row.seo_report).autoPublish);
  if (!manualInputAllowed(run)) return NextResponse.json({ error: "자동 포스팅이 진행 중인 원고라 입력 결과를 따로 기록하지 않습니다." }, { status: 409 });
  let update = db.from("naver_blog_seo_drafts")
    .update({ naver_input_status: status === "publish_ready" ? "completed" : status, naver_input_completed_at: completedAt, naver_input_error: error })
    .eq("id", draftId).eq("user_id", user.userId).gte("created_at", cutoff).not("extension_handoff_at", "is", null);
  update = run.runId
    ? update.eq("seo_report->autoPublish->>runId", String(run.runId)).eq("seo_report->autoPublish->>state", String(run.state))
    : update.is("seo_report->autoPublish->>runId", null);
  const { data, error: updateError } = await update.select("id, naver_input_status, naver_input_completed_at").maybeSingle();
  if (updateError) return NextResponse.json({ error: "입력 결과 기록에 실패했습니다." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "다른 실행이 먼저 반영됐습니다. 원고 상태를 다시 확인해 주세요." }, { status: 409 });
  return NextResponse.json({ result: data });
}
