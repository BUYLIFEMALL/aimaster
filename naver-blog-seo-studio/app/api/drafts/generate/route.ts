import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { resolveApiKey } from "@/lib/apiKeys";
import { generateSeoDraft, SEO_STRATEGY_NAMES } from "@/lib/ai/generator";
import { isContentProvider, resolveContentModel } from "@/lib/ai/contentModels";
import { resolveSeoPersona } from "@/lib/ai/personas";
import { purgeExpiredDrafts } from "@/lib/draftRetention";
import { isApproved, type GroundPoint, type ResearchSource } from "@/lib/grounding";
import type { DraftGrounding } from "@/lib/ai/groundingPrompt";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// v1.74: 화면·생성기와 같은 목록을 씁니다(예전 옛 이름 목록 때문에 홈판 스토리·인사이트 엣지가 항상 거부됐음).
const strategies = new Set(SEO_STRATEGY_NAMES);
const EXPERIENCE_NOTE_MAX = 1_500;

export async function POST(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const input = await request.json().catch(() => null) as { topic?: string; keywords?: string; strategy?: string; selectedTitle?: string; personaId?: string; customPersona?: string; sourceContext?: string; provider?: unknown; model?: unknown; experienceNote?: unknown; naturalStyle?: unknown; includeFaq?: unknown; researchId?: unknown } | null;
  const experienceNote = typeof input?.experienceNote === "string" ? input.experienceNote.trim() : "";
  if (experienceNote.length > EXPERIENCE_NOTE_MAX) return NextResponse.json({ error: `내 실제 경험은 ${EXPERIENCE_NOTE_MAX.toLocaleString("ko-KR")}자 이내로 입력해주세요.` }, { status: 400 });
  const options = { experienceNote: experienceNote || undefined, naturalStyle: input?.naturalStyle === true, includeFaq: input?.includeFaq === true };
  const topic = input?.topic?.trim() ?? "";
  const strategy = input?.strategy?.trim() ?? "";
  const provider = isContentProvider(input?.provider) ? input.provider : "openai";
  const keywords = (input?.keywords ?? "").split(",").map((keyword) => keyword.trim()).filter(Boolean).slice(0, 10);
  const sourceContext = input?.sourceContext?.trim().slice(0, 2_000) || undefined;
  if (!topic || topic.length > 300) return NextResponse.json({ error: "주제를 1~300자로 입력해주세요." }, { status: 400 });
  if (!strategies.has(strategy)) return NextResponse.json({ error: "지원하지 않는 글쓰기 전략입니다." }, { status: 400 });
  let persona;
  try { persona = resolveSeoPersona(input?.personaId, input?.customPersona); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "페르소나 설정이 올바르지 않습니다." }, { status: 400 }); }

  const supabase = await createClient();
  await purgeExpiredDrafts(supabase, access.user.id);
  // BLC-08a: 「자료부터 집필」 — researchId가 있을 때만. 승인·지문이 맞는 본인 자료의 남긴 근거만 쓴다(없으면 기존 경로 그대로).
  let grounding: DraftGrounding | undefined;
  let groundingRecord: Record<string, unknown> | undefined;
  if (input?.researchId !== undefined) {
    const researchId = typeof input.researchId === "string" ? input.researchId : "";
    const { data: research } = researchId ? await supabase.from("naver_blog_seo_research").select("id, keyword, sources, points, angle, approved_at, approval_hash")
      .eq("id", researchId).eq("user_id", access.user.id).maybeSingle() : { data: null };
    if (!research) return NextResponse.json({ error: "선택한 내 자료를 찾지 못했습니다. 자료가 30일이 지나 삭제됐을 수 있습니다." }, { status: 404 });
    if (!isApproved(research)) return NextResponse.json({ code: "RESEARCH_NOT_APPROVED", error: "근거를 승인한 뒤 바뀌었거나 아직 승인하지 않았습니다. 「자료부터 집필」에서 근거를 다시 승인해주세요." }, { status: 409 });
    const sourcesByN = new Map((research.sources as ResearchSource[]).map((source) => [source.n, source]));
    const points = (research.points as GroundPoint[]).filter((point) => point.kept).map((point) => ({ text: point.text, source: point.source, quote: point.quote, title: sourcesByN.get(point.source)?.title ?? "", link: sourcesByN.get(point.source)?.link ?? "" }));
    grounding = { keyword: research.keyword, angle: research.angle ?? undefined, points };
    groundingRecord = { researchId: research.id, keyword: research.keyword, approvalHash: research.approval_hash, approvedAt: research.approved_at, points };
  }
  const apiKey = await resolveApiKey(supabase, access.user.id, provider);
  if (!apiKey) {
    const label = provider === "anthropic" ? "Claude" : provider === "gemini" ? "Gemini" : "OpenAI";
    return NextResponse.json({ code: "API_KEY_REQUIRED", error: `${label} API 키를 먼저 등록해주세요.` }, { status: 400 });
  }

  try {
    const draft = await generateSeoDraft({ apiKey, provider, topic, keywords, strategy, persona, sourceContext, options, model: resolveContentModel(provider, input?.model), grounding });
    if (input?.selectedTitle?.trim()) draft.title = input.selectedTitle.trim().slice(0, 150);
    const seoReport = groundingRecord ? { ...draft.seoReport, grounding: groundingRecord } : draft.seoReport;
    const { data: saved, error } = await supabase.from("naver_blog_seo_drafts")
      .insert({ user_id: access.user.id, topic, keywords, strategy, title: draft.title, body: draft.body, seo_report: seoReport, status: "ready" })
      .select("id, title, body, seo_report, created_at").single();
    if (error) return NextResponse.json({ error: "블로그(원문) 저장에 실패했습니다." }, { status: 500 });
    return NextResponse.json({ draft: saved });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "AI 글 생성에 실패했습니다." }, { status: 502 });
  }
}
