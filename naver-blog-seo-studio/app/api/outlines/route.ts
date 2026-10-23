import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { resolveApiKey } from "@/lib/apiKeys";
import { isContentProvider, resolveContentModel } from "@/lib/ai/contentModels";
import { getKoreaToday } from "@/lib/ai/freshness";
import { requestDraftJson, SEO_STRATEGY_NAMES } from "@/lib/ai/generator";
import { resolveSeoPersona } from "@/lib/ai/personas";
import { outlinePrompt } from "@/lib/ai/sectionPrompt";
import { purgeExpiredOutlines } from "@/lib/draftRetention";
import { isFail, loadGrounding, loadStyle, OUTLINE_COLUMNS, sectionRules } from "@/lib/outlineContext";
import { normalizeOutline } from "@/lib/sections";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// BLC-09 (2026-10-22): 「구간별로 쓰기」 — 승인한 자료(본인)의 최근 목차 목록(30일 보관).
export async function GET(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const researchId = new URL(request.url).searchParams.get("researchId") ?? "";
  const supabase = await createClient();
  let query = supabase.from("naver_blog_seo_outlines").select(OUTLINE_COLUMNS).eq("user_id", access.user.id).order("created_at", { ascending: false }).limit(10);
  if (researchId) query = query.eq("research_id", researchId);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "구간 목록을 불러오지 못했습니다." }, { status: 500 });
  return NextResponse.json({ outlines: data ?? [] });
}

// 목차 만들기 — 회원 본인 AI 키 1회(자동 재시도 없음). 승인 근거·승인 문체만 사용한다.
export async function POST(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const input = await request.json().catch(() => null) as { researchId?: unknown; styleId?: unknown; provider?: unknown; model?: unknown; strategy?: unknown; personaId?: unknown; customPersona?: unknown } | null;
  const provider = isContentProvider(input?.provider) ? input.provider : "openai";
  const strategy = typeof input?.strategy === "string" && SEO_STRATEGY_NAMES.includes(input.strategy) ? input.strategy : SEO_STRATEGY_NAMES[0];
  const personaId = typeof input?.personaId === "string" ? input.personaId : undefined;
  const customPersona = typeof input?.customPersona === "string" ? input.customPersona : undefined;
  let persona;
  try { persona = resolveSeoPersona(personaId, customPersona); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "페르소나 설정이 올바르지 않습니다." }, { status: 400 }); }

  const supabase = await createClient();
  await purgeExpiredOutlines(supabase, access.user.id);
  const loaded = await loadGrounding(supabase, access.user.id, input?.researchId);
  if (isFail(loaded)) return NextResponse.json({ code: loaded.code, error: loaded.error }, { status: loaded.status });
  const styled = await loadStyle(supabase, access.user.id, input?.styleId);
  if (isFail(styled)) return NextResponse.json({ code: styled.code, error: styled.error }, { status: styled.status });
  const apiKey = await resolveApiKey(supabase, access.user.id, provider);
  if (!apiKey) {
    const label = provider === "anthropic" ? "Claude" : provider === "gemini" ? "Gemini" : "OpenAI";
    return NextResponse.json({ code: "API_KEY_REQUIRED", error: `${label} API 키를 먼저 등록해주세요.` }, { status: 400 });
  }

  let outline;
  try {
    const prompt = outlinePrompt({ today: getKoreaToday(), persona, rules: sectionRules(loaded.grounding, styled.style), keyword: loaded.grounding.keyword });
    outline = normalizeOutline(await requestDraftJson(apiKey, provider, resolveContentModel(provider, input?.model), [
      { role: "system", content: prompt.system },
      { role: "user", content: prompt.user },
    ]));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "글 구성을 만들지 못했습니다." }, { status: 502 });
  }
  if (!outline) return NextResponse.json({ error: "글 구성을 만들지 못했습니다(제목 또는 구간 수 부족). 다시 시도해 주세요." }, { status: 502 });

  const { data, error } = await supabase.from("naver_blog_seo_outlines").insert({
    user_id: access.user.id, research_id: loaded.record.researchId, style_id: styled.record?.styleId ?? null, keyword: loaded.grounding.keyword,
    title: outline.titles[0], titles: outline.titles, sections: outline.sections, status: "outline",
    strategy, persona_id: personaId ?? null, custom_persona: personaId === "custom" ? customPersona ?? null : null,
  }).select(OUTLINE_COLUMNS).single();
  if (error) return NextResponse.json({ error: "글 구성을 저장하지 못했습니다." }, { status: 500 });
  return NextResponse.json({ outline: data });
}
