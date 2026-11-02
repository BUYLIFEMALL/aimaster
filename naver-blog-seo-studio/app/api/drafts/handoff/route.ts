import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { reviewBlockMessage } from "@/lib/draftReview";
import { draftReport } from "@/lib/draftWriteGuard";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const input = await request.json().catch(() => null) as { draftId?: string } | null;
  const draftId = input?.draftId?.trim();
  if (!draftId) return NextResponse.json({ error: "전송할 초안을 선택해주세요." }, { status: 400 });
  const supabase = await createClient();
  // 병합 B-1: 현재 글을 AI 검수했고 필수 지적이 남아 있으면 넘기지 않는다(검수하지 않은 글은 그대로 넘김).
  const { data: current } = await supabase.from("naver_blog_seo_drafts").select("title, body, seo_report").eq("id", draftId).eq("user_id", access.user.id).maybeSingle();
  // 2026-11-02: 자동 포스팅을 한 번 시작한 원고는 다시 보낼 수 없다 — 「찾지 못했습니다」 대신 복제 안내를 보여 준다.
  if ((draftReport(current?.seo_report).autoPublish as { runId?: unknown } | undefined)?.runId) return NextResponse.json({ code: "ALREADY_RUN", error: "이미 자동 포스팅을 시작한 원고라 다시 보낼 수 없습니다. 생성 기록에서 이 원고를 「복제」한 뒤 새 원고로 보내 주세요." }, { status: 409 });
  const blocked = current ? reviewBlockMessage(draftReport(current.seo_report), current.title, current.body) : null;
  if (blocked) return NextResponse.json({ code: "REVIEW_MUST_FIX", error: blocked }, { status: 409 });
  const { data, error } = await supabase.from("naver_blog_seo_drafts")
    .update({ extension_handoff_at: new Date().toISOString(), extension_imported_at: null })
    .eq("id", draftId).eq("user_id", access.user.id).is("seo_report->autoPublish->>runId", null).gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString())
    .select("id, title, extension_handoff_at").maybeSingle();
  if (error) return NextResponse.json({ error: "확장 프로그램 전송 준비에 실패했습니다." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "본인 초안을 찾지 못했습니다." }, { status: 404 });
  return NextResponse.json({ handoff: data });
}
