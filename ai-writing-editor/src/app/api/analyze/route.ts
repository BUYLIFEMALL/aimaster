import { NextResponse, type NextRequest } from "next/server";
import { fail, guardAi, json } from "@/lib/aiRoute";
import { generateJson } from "@/lib/gemini";
import { LIMITS } from "@/lib/we/types";
import { analyzePrompt, analyzeSchema } from "@/lib/we/prompts";
import { cleanText, normalizeSuggestions } from "@/lib/we/util";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 90;

/** 전체 글 분석: {content} → {suggestions, truncated} (본문에 실제로 있는 원문만 돌려준다) */
export async function POST(request: NextRequest) {
  const g = await guardAi(request);
  if (g instanceof NextResponse) return g;
  const { body, apiKey } = g;

  const full = cleanText(body.content, LIMITS.document);
  if (full.trim().length < 20) return json({ suggestions: [], truncated: false, note: "글이 너무 짧아 분석할 내용이 없습니다." });
  const content = full.slice(0, LIMITS.analyze);
  const truncated = full.length > content.length;

  try {
    const p = analyzePrompt(content);
    const out = await generateJson({ apiKey, system: p.system, user: p.user, schema: analyzeSchema, temperature: 0.2, maxOutputTokens: 8192 });
    return json({ suggestions: normalizeSuggestions(out.data, content), truncated });
  } catch (e) {
    return fail(e);
  }
}
