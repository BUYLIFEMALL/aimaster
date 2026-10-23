import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { resolveApiKey } from "@/lib/apiKeys";
import { generateContentJson } from "@/lib/ai/contentJson";
import { isContentProvider, resolveContentModel } from "@/lib/ai/contentModels";
import { buildReviewPrompt, parseReview, reviewHash } from "@/lib/draftReview";
import { draftReport, nextDraftReport, writableDraft } from "@/lib/draftWriteGuard";
import { copiesSource, quoteInText, type ResearchSource } from "@/lib/grounding";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 120;

// 병합 B-1(작업실 → SEO 스튜디오): 원고 AI 검수 6영역. 회원 본인 키·고른 모델로 1회 호출, 결과는 seo_report.review(DB 변경 없음).
// 검수 도중 원고가 바뀌면 결과를 버린다(작업실 review와 같은 409).
export async function POST(request: Request, context: { params: Promise<{ draftId: string }> }) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const { draftId } = await context.params;
  const input = await request.json().catch(() => null) as { provider?: unknown; model?: unknown } | null;
  const provider = isContentProvider(input?.provider) ? input.provider : "openai";
  const supabase = await createClient();

  const { data: draft } = await supabase.from("naver_blog_seo_drafts").select("title, body, seo_report")
    .eq("id", draftId).eq("user_id", access.user.id).maybeSingle();
  if (!draft) return NextResponse.json({ error: "본인 원고를 찾지 못했습니다." }, { status: 404 });
  const title = String(draft.title || "").trim(), body = String(draft.body || "").trim();
  if (!title || !body) return NextResponse.json({ error: "제목과 본문을 먼저 저장해 주세요." }, { status: 400 });

  const apiKey = await resolveApiKey(supabase, access.user.id, provider);
  if (!apiKey) {
    const label = provider === "anthropic" ? "Claude" : provider === "gemini" ? "Gemini" : "OpenAI";
    return NextResponse.json({ code: "API_KEY_REQUIRED", error: `${label} API 키를 먼저 등록해주세요.` }, { status: 400 });
  }

  // 원고를 만들 때 남긴 승인 근거·문체를 검수 기준으로 쓴다. 조사 자료 원문은 「자료 유사 표현」 판정에만 쓴다(본인 자료만).
  const report = draftReport(draft.seo_report);
  const grounding = draftReport(report.grounding), style = draftReport(report.style);
  const points = Array.isArray(grounding.points) ? (grounding.points as Array<{ text?: unknown }>).map((p) => String(p.text || "")).filter(Boolean).slice(0, 30) : [];
  let sourceTexts: string[] = [];
  if (typeof grounding.researchId === "string") {
    const { data: research } = await supabase.from("naver_blog_seo_research").select("sources").eq("id", grounding.researchId).eq("user_id", access.user.id).maybeSingle();
    sourceTexts = Array.isArray(research?.sources) ? (research.sources as ResearchSource[]).filter((s) => s.ok && s.text).map((s) => s.text) : [];
  }

  const model = resolveContentModel(provider, input?.model);
  let parsed: Record<string, unknown>;
  try {
    const prompt = buildReviewPrompt({ title, body, year: new Date().getFullYear(), style: typeof style.name === "string" ? { name: style.name, ending: typeof style.ending === "string" ? style.ending : undefined } : null, points });
    parsed = await generateContentJson({ apiKey, provider, model, ...prompt });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "AI 검수에 실패했습니다." }, { status: 502 });
  }
  const { issues, summary } = parseReview(parsed, body, { quoteInText, copiesSource }, sourceTexts);

  // 저장 직전 최신 원고를 다시 읽어, 검수한 글과 같을 때만 결과를 붙인다.
  const { data: latest } = await supabase.from("naver_blog_seo_drafts").select("title, body, seo_report")
    .eq("id", draftId).eq("user_id", access.user.id).maybeSingle();
  if (!latest || reviewHash(String(latest.title || "").trim(), String(latest.body || "").trim()) !== reviewHash(title, body)) {
    return NextResponse.json({ error: "검수 도중 원고가 바뀌어 결과를 적용하지 않았습니다. 다시 검수해 주세요." }, { status: 409 });
  }
  const latestReport = draftReport(latest.seo_report);
  const review = { issues, summary, at: new Date().toISOString(), bodyHash: reviewHash(title, body), model: `${provider}:${model}` };
  const { data: saved, error } = await writableDraft(supabase.from("naver_blog_seo_drafts")
    .update({ seo_report: nextDraftReport(latestReport, { review }) })
    .eq("id", draftId).eq("user_id", access.user.id), latestReport)
    .select("id, seo_report").maybeSingle();
  if (error) return NextResponse.json({ error: "검수 결과를 저장하지 못했습니다." }, { status: 500 });
  if (!saved) return NextResponse.json({ error: "자동 포스팅 중이거나 다른 저장이 먼저 반영됐습니다. 원고를 다시 열어 주세요." }, { status: 409 });
  return NextResponse.json({ review, seoReport: saved.seo_report });
}
