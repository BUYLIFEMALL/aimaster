import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { resolveApiKey } from "@/lib/apiKeys";
import { isContentProvider, resolveContentModel } from "@/lib/ai/contentModels";
import { fixStyleEnding, normalizeSeoReport, type StyleEndingRecord } from "@/lib/ai/generator";
import { isFail, loadGrounding, loadStyle, OUTLINE_COLUMNS } from "@/lib/outlineContext";
import { endingShare } from "@/lib/style";
import { joinSections, sectionsHash, type OutlineSection } from "@/lib/sections";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const DRAFT_COLUMNS = "id, topic, keywords, strategy, title, body, seo_report, status, created_at, image_path, image_model, image_mime_type, naver_input_status, naver_input_completed_at, naver_input_error, category_id, naver_category";

// BLC-09 (2026-10-22): 모든 구간을 하나의 원고로 합쳐 기존 원고 표에 저장 — 원고 화면·발행 전 점검·확장 전달·자동 발행을 그대로 쓴다.
// 같은 구간 내용으로 이미 합쳤으면 그 원고를 돌려주고(중복 생성·중복 과금 없음), 구간이 바뀌었으면 기존 원고는 두고 새 원고를 만든다.
// 승인 문체가 해요체/합니다체면 끝맺음 안전 수정 1회(fixStyleEnding — 1,500자·95%·비율 개선 시만 채택, 실패해도 원래 본문으로 저장).
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await context.params;
  const input = await request.json().catch(() => null) as { title?: unknown; provider?: unknown; model?: unknown } | null;
  const provider = isContentProvider(input?.provider) ? input.provider : "openai";
  const supabase = await createClient();
  const { data: outline } = await supabase.from("naver_blog_seo_outlines").select(OUTLINE_COLUMNS).eq("id", id).eq("user_id", access.user.id).maybeSingle();
  if (!outline) return NextResponse.json({ error: "내 글 구성을 찾지 못했습니다. 30일이 지나 삭제됐을 수 있습니다." }, { status: 404 });
  const sections = outline.sections as OutlineSection[];
  if (!sections.every((s) => s.status === "done" && s.body.trim())) return NextResponse.json({ error: "아직 쓰지 않았거나 실패한 구간이 있습니다. 모든 구간을 쓴 뒤 합쳐 주세요." }, { status: 400 });
  const hash = sectionsHash(sections);
  if (outline.draft_id && outline.joined_hash === hash) {
    const { data: existing } = await supabase.from("naver_blog_seo_drafts").select(DRAFT_COLUMNS).eq("id", outline.draft_id).eq("user_id", access.user.id).maybeSingle();
    if (existing) return NextResponse.json({ draft: existing, outline, reused: true });
  }

  const loaded = await loadGrounding(supabase, access.user.id, outline.research_id);
  if (isFail(loaded)) return NextResponse.json({ code: loaded.code, error: loaded.error }, { status: loaded.status });
  const styled = await loadStyle(supabase, access.user.id, outline.style_id);
  if (isFail(styled)) return NextResponse.json({ code: styled.code, error: styled.error }, { status: styled.status });
  const titles = (outline.titles as string[]) ?? [];
  const title = typeof input?.title === "string" && titles.includes(input.title) ? input.title : outline.title;

  let body = joinSections(sections);
  let styleEnding: StyleEndingRecord | undefined;
  const ending = styled.style?.ending;
  if (ending && endingShare(body, ending) < 0.7) {
    const apiKey = await resolveApiKey(supabase, access.user.id, provider);
    if (!apiKey) {
      const label = provider === "anthropic" ? "Claude" : provider === "gemini" ? "Gemini" : "OpenAI";
      return NextResponse.json({ code: "API_KEY_REQUIRED", error: `${label} API 키를 먼저 등록해주세요.` }, { status: 400 });
    }
    try {
      const fixed = await fixStyleEnding({ apiKey, provider, model: resolveContentModel(provider, input?.model), body, ending, startedAt: Date.now() });
      body = fixed.body;
      styleEnding = fixed.record;
    } catch (error) {
      // 끝맺음 수정이 실패해도 이미 쓴 구간으로 원고는 만든다(후처리가 저장을 막지 않게).
      const share = Math.round(endingShare(body, ending) * 100) / 100;
      styleEnding = { target: ending, before: share, after: share, fixed: false, skipped: error instanceof Error ? error.message.slice(0, 200) : "끝맺음 수정 실패" };
    }
  } else if (ending) {
    const share = Math.round(endingShare(body, ending) * 100) / 100;
    styleEnding = { target: ending, before: share, after: share, fixed: false };
  }

  const compactLength = body.replace(/\s/g, "").length;
  const seoReport: Record<string, unknown> = {
    ...normalizeSeoReport({ searchIntent: loaded.grounding.angle ?? "" }, body),
    grounding: loaded.record,
    ...(styled.record ? { style: styled.record } : {}),
    ...(styleEnding ? { styleEnding } : {}),
    sections: { outlineId: outline.id, hash, count: sections.length },
  };
  if (compactLength < 2_000) seoReport.lengthNotice = `본문이 공백 제외 ${compactLength.toLocaleString("ko-KR")}자로 권장 분량(2,000자)보다 짧습니다. 구간을 다시 쓰거나 직접 보강해 보세요.`;
  const { data: draft, error } = await supabase.from("naver_blog_seo_drafts")
    .insert({ user_id: access.user.id, topic: outline.keyword, keywords: [outline.keyword], strategy: outline.strategy, title, body, seo_report: seoReport, status: "ready" })
    .select(DRAFT_COLUMNS).single();
  if (error) return NextResponse.json({ error: "원고를 저장하지 못했습니다." }, { status: 500 });
  const { data: updated } = await supabase.from("naver_blog_seo_outlines")
    .update({ status: "joined", draft_id: draft.id, joined_hash: hash, title, updated_at: new Date().toISOString() })
    .eq("id", id).eq("user_id", access.user.id).select(OUTLINE_COLUMNS).maybeSingle();
  return NextResponse.json({ draft, outline: updated ?? outline, reused: false });
}
