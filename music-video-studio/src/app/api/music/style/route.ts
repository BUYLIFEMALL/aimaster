import { NextResponse } from "next/server";
import { authorize, requireGeminiKey, rec, errorJson } from "@/lib/apiGuard";
import { callLlm, LlmError } from "@/lib/ai/llm";
import { buildStyleAnalysisPrompt, parseStyleProfile } from "@/lib/music/prompts";
import { cleanRefs } from "@/lib/music/refs";
import { TEXT_MODEL } from "@/lib/music/presets";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;

/** v1.26 참고 이미지(최대 3장)의 화풍을 분석한다(회원 본인 Gemini 키, 텍스트 호출 1건 — 이미지는 저장하지 않는다). */
export async function POST(request: Request) {
  try {
    const gate = await authorize();
    if (!gate.ok) return gate.response;
    const body = rec(await request.json());
    const references = cleanRefs(body.references);
    if (references.length === 0) return errorJson("분석할 참고 이미지를 먼저 넣어주세요.", 400);
    const key = await requireGeminiKey(gate.auth.user.id);
    if (!key.ok) return key.response;

    const prompt = buildStyleAnalysisPrompt(references.length);
    const text = await callLlm({ provider: "gemini", model: TEXT_MODEL, apiKey: key.apiKey, system: prompt.system, user: prompt.user, images: references, json: true });
    const profile = parseStyleProfile(text);
    if (!profile) return errorJson("화풍 분석 응답 형식이 맞지 않습니다. 다시 시도해주세요.");
    return NextResponse.json({ profile });
  } catch (err) {
    if (err instanceof LlmError) return errorJson(err.message, err.status);
    console.error("style analyze error:", String((err as Error)?.message ?? "").slice(0, 200));
    return errorJson("화풍 분석 중 오류가 발생했습니다. 잠시 뒤 다시 시도해주세요.", 500);
  }
}
