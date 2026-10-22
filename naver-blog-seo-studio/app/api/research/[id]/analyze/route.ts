import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { resolveApiKey } from "@/lib/apiKeys";
import { isContentProvider, resolveContentModel } from "@/lib/ai/contentModels";
import { getKoreaToday } from "@/lib/ai/freshness";
import { requestDraftJson } from "@/lib/ai/generator";
import { researchPrompt } from "@/lib/ai/groundingPrompt";
import { filterPoints, type ResearchSource } from "@/lib/grounding";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// BLC-08a (2026-10-22): 「자료부터 집필」 2단계 — 근거 정리(회원 본인 AI 키 1회, 자동 재시도 없음).
// 인용이 해당 자료 원문에 실제로 있고 원문을 그대로 베끼지 않은 항목만 남기며, 다시 정리하면 이전 승인은 풀린다.
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await context.params;
  const input = await request.json().catch(() => null) as { provider?: unknown; model?: unknown } | null;
  const provider = isContentProvider(input?.provider) ? input.provider : "openai";
  const supabase = await createClient();
  const { data: research } = await supabase.from("naver_blog_seo_research").select("id, keyword, sources")
    .eq("id", id).eq("user_id", access.user.id).maybeSingle();
  if (!research) return NextResponse.json({ error: "내 자료를 찾지 못했습니다." }, { status: 404 });
  const sources = (Array.isArray(research.sources) ? research.sources : []) as ResearchSource[];
  if (!sources.length) return NextResponse.json({ error: "먼저 자료를 모아주세요." }, { status: 400 });

  const apiKey = await resolveApiKey(supabase, access.user.id, provider);
  if (!apiKey) {
    const label = provider === "anthropic" ? "Claude" : provider === "gemini" ? "Gemini" : "OpenAI";
    return NextResponse.json({ code: "API_KEY_REQUIRED", error: `${label} API 키를 먼저 등록해주세요.` }, { status: 400 });
  }

  let raw: Record<string, unknown>;
  try {
    const prompt = researchPrompt(research.keyword, sources, getKoreaToday());
    raw = await requestDraftJson(apiKey, provider, resolveContentModel(provider, input?.model), [
      { role: "system", content: prompt.system },
      { role: "user", content: prompt.user },
    ]) as unknown as Record<string, unknown>;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "근거 정리에 실패했습니다." }, { status: 502 });
  }
  const { points, dropped } = filterPoints(raw.points, sources);
  if (!points.length) return NextResponse.json({ error: "자료에서 인용으로 확인되는 근거를 만들지 못했습니다. 다시 시도하거나 다른 검색어·자료를 넣어주세요.", dropped }, { status: 502 });
  const angle = typeof raw.angle === "string" ? raw.angle.trim().slice(0, 800) : "";
  const { data, error } = await supabase.from("naver_blog_seo_research")
    .update({ points, angle, approved_at: null, approval_hash: null, updated_at: new Date().toISOString() })
    .eq("id", id).eq("user_id", access.user.id)
    .select("id, keyword, sources, points, angle, approved_at, approval_hash, created_at, updated_at").single();
  if (error) return NextResponse.json({ error: "정리한 근거를 저장하지 못했습니다." }, { status: 500 });
  return NextResponse.json({ research: data, dropped });
}
