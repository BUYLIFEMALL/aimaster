import { NextResponse, type NextRequest } from "next/server";
import { fail, guardAi, json } from "@/lib/aiRoute";
import { generatePlain } from "@/lib/gemini";
import { LIMITS, isFormat, isLength, isTone } from "@/lib/we/types";
import { generatePrompt } from "@/lib/we/prompts";
import { cleanLine, cleanText } from "@/lib/we/util";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 120;

/** 새 글 초안 생성: {prompt, reference?, format, tone, length, useInternet} → {content, sources} */
export async function POST(request: NextRequest) {
  const g = await guardAi(request);
  if (g instanceof NextResponse) return g;
  const { body, apiKey } = g;

  const prompt = cleanLine(body.prompt, LIMITS.prompt);
  if (!prompt) return json({ error: "주제나 요청 내용을 입력해 주세요." }, 400);
  const reference = cleanText(body.reference, LIMITS.reference).trim() || null;
  const format = isFormat(body.format) ? body.format : "free";
  const tone = isTone(body.tone) ? body.tone : "default";
  const length = isLength(body.length) ? body.length : "medium";
  const useInternet = body.useInternet === true;

  try {
    const p = generatePrompt({ prompt, reference, format, tone, length, useInternet });
    const out = await generatePlain({ apiKey, system: p.system, user: p.user, grounded: useInternet, temperature: 0.7, maxOutputTokens: length === "long" ? 12000 : 8192 });
    return json({ content: out.text, sources: out.sources, format });
  } catch (e) {
    return fail(e);
  }
}
