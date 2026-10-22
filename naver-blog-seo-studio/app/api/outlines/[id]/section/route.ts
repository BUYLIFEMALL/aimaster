import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { checkProgramAccessApi } from "@/lib/access";
import { resolveApiKey } from "@/lib/apiKeys";
import { isContentProvider, resolveContentModel } from "@/lib/ai/contentModels";
import { getKoreaToday } from "@/lib/ai/freshness";
import { requestDraftJson } from "@/lib/ai/generator";
import { resolveSeoPersona } from "@/lib/ai/personas";
import { sectionPrompt } from "@/lib/ai/sectionPrompt";
import { isFail, loadGrounding, loadStyle, OUTLINE_COLUMNS, sectionRules } from "@/lib/outlineContext";
import { applySection, cleanSectionBody, outlineStatus, type OutlineSection } from "@/lib/sections";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 저장 직전 최신 행에 이 구간만 반영한다. 그 사이 다른 구간이 저장됐으면(수정 시각이 다르면) 다시 읽어 한 번 더 시도.
async function saveSection(supabase: SupabaseClient, userId: string, id: string, index: number, result: { body: string } | { error: string }) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data: latest } = await supabase.from("naver_blog_seo_outlines").select("sections, status, updated_at").eq("id", id).eq("user_id", userId).maybeSingle();
    if (!latest) return null;
    const sections = applySection(latest.sections as OutlineSection[], index, result);
    const status = latest.status === "joined" && "error" in result ? "joined" : outlineStatus(sections);
    const { data } = await supabase.from("naver_blog_seo_outlines").update({ sections, status, updated_at: new Date().toISOString() })
      .eq("id", id).eq("user_id", userId).eq("updated_at", latest.updated_at).select(OUTLINE_COLUMNS).maybeSingle();
    if (data) return data;
  }
  return null;
}

// BLC-09 (2026-10-22): 구간 하나 쓰기 — 회원 본인 AI 키 1회. 화면이 순서대로 부르며, 쓴 구간은 바로 저장돼 중지·실패해도 남는다.
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await context.params;
  const input = await request.json().catch(() => null) as { index?: unknown; provider?: unknown; model?: unknown } | null;
  const provider = isContentProvider(input?.provider) ? input.provider : "openai";
  const index = Number(input?.index);
  const supabase = await createClient();
  const { data: outline } = await supabase.from("naver_blog_seo_outlines").select(OUTLINE_COLUMNS).eq("id", id).eq("user_id", access.user.id).maybeSingle();
  if (!outline) return NextResponse.json({ error: "내 글 구성을 찾지 못했습니다. 30일이 지나 삭제됐을 수 있습니다." }, { status: 404 });
  const sections = outline.sections as OutlineSection[];
  if (!Number.isInteger(index) || index < 0 || index >= sections.length) return NextResponse.json({ error: "쓸 구간을 확인해 주세요." }, { status: 400 });

  const loaded = await loadGrounding(supabase, access.user.id, outline.research_id);
  if (isFail(loaded)) return NextResponse.json({ code: loaded.code, error: loaded.error }, { status: loaded.status });
  const styled = await loadStyle(supabase, access.user.id, outline.style_id);
  if (isFail(styled)) return NextResponse.json({ code: styled.code, error: styled.error }, { status: styled.status });
  let persona;
  try { persona = resolveSeoPersona(outline.persona_id ?? undefined, outline.custom_persona ?? undefined); }
  catch { persona = resolveSeoPersona(); }
  const apiKey = await resolveApiKey(supabase, access.user.id, provider);
  if (!apiKey) {
    const label = provider === "anthropic" ? "Claude" : provider === "gemini" ? "Gemini" : "OpenAI";
    return NextResponse.json({ code: "API_KEY_REQUIRED", error: `${label} API 키를 먼저 등록해주세요.` }, { status: 400 });
  }

  let result: { body: string } | { error: string };
  try {
    const prompt = sectionPrompt({ today: getKoreaToday(), persona, rules: sectionRules(loaded.grounding, styled.style), title: outline.title, sections, index });
    const raw = await requestDraftJson(apiKey, provider, resolveContentModel(provider, input?.model), [
      { role: "system", content: prompt.system },
      { role: "user", content: prompt.user },
    ]);
    const body = cleanSectionBody(raw.body, sections[index].heading);
    result = body ? { body } : { error: "이 구간 본문이 너무 짧게 만들어졌습니다. 이 구간만 다시 써 주세요." };
  } catch (error) {
    result = { error: error instanceof Error ? error.message : "이 구간을 쓰지 못했습니다." };
  }
  const saved = await saveSection(supabase, access.user.id, id, index, result);
  if (!saved) return NextResponse.json({ error: "구간을 저장하지 못했습니다. 새로고침 후 다시 시도해 주세요." }, { status: 500 });
  if ("error" in result) return NextResponse.json({ error: result.error, outline: saved }, { status: 502 });
  return NextResponse.json({ outline: saved });
}
