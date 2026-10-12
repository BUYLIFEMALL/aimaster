import { NextResponse } from "next/server";
import { authorize, requireGeminiKey, rec, errorJson } from "@/lib/apiGuard";
import { callLlm, LlmError } from "@/lib/ai/llm";
import { buildLyricsPrompt, parseLyrics } from "@/lib/music/prompts";
import { GENRES, TEXT_MODEL } from "@/lib/music/presets";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;

/** 주제·장르로 제목·Suno 스타일·가사를 만든다(회원 본인 Gemini 키, 텍스트 호출 1건). */
export async function POST(request: Request) {
  try {
    const gate = await authorize();
    if (!gate.ok) return gate.response;
    const body = rec(await request.json());
    const topic = typeof body.topic === "string" ? body.topic.trim().slice(0, 120) : "";
    const genre = typeof body.genre === "string" && GENRES.some((g) => g.value === body.genre) ? body.genre : GENRES[0].value;
    if (!topic) return errorJson("노래 주제를 입력해주세요.", 400);
    const key = await requireGeminiKey(gate.auth.user.id);
    if (!key.ok) return key.response;

    const prompt = buildLyricsPrompt({ topic, genre });
    const text = await callLlm({ provider: "gemini", model: TEXT_MODEL, apiKey: key.apiKey, system: prompt.system, user: prompt.user, json: true });
    const parsed = parseLyrics(text);
    if (!parsed) return errorJson("AI 응답 형식이 맞지 않습니다. 다시 시도해주세요.");
    return NextResponse.json(parsed);
  } catch (err) {
    if (err instanceof LlmError) return errorJson(err.message, err.status);
    console.error("lyrics error:", String((err as Error)?.message ?? "").slice(0, 200));
    return errorJson("가사 생성 중 오류가 발생했습니다. 잠시 뒤 다시 시도해주세요.", 500);
  }
}
