import { NextResponse } from "next/server";
import { authorize, requireGeminiKey, rec, errorJson } from "@/lib/apiGuard";
import { callLlm, LlmError } from "@/lib/ai/llm";
import { buildStoryboardPrompt, parseStoryboard } from "@/lib/music/prompts";
import { ART_STYLES, SCENE_COUNTS, TEXT_MODEL, type ArtStyleId } from "@/lib/music/presets";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;

/** 가사를 장면으로 나누고 장면별 영문 촬영 묘사를 만든다(회원 본인 Gemini 키, 텍스트 호출 1건). */
export async function POST(request: Request) {
  try {
    const gate = await authorize();
    if (!gate.ok) return gate.response;
    const body = rec(await request.json());
    const lyrics = typeof body.lyrics === "string" ? body.lyrics.trim().slice(0, 3000) : "";
    if (!lyrics) return errorJson("먼저 1단계에서 가사를 입력하거나 만들어주세요.", 400);
    const sceneCount = (SCENE_COUNTS as readonly number[]).includes(body.sceneCount as number) ? (body.sceneCount as number) : 4;
    const artStyle = (ART_STYLES.some((s) => s.value === body.artStyle) ? body.artStyle : "cinematic") as ArtStyleId;
    const key = await requireGeminiKey(gate.auth.user.id);
    if (!key.ok) return key.response;

    const prompt = buildStoryboardPrompt({
      title: typeof body.title === "string" ? body.title : "",
      sunoStyle: typeof body.sunoStyle === "string" ? body.sunoStyle : "",
      lyrics,
      sceneCount,
      extra: typeof body.extra === "string" ? body.extra : "",
      artStyle,
      hasReferenceImages: false,
    });
    const text = await callLlm({ provider: "gemini", model: TEXT_MODEL, apiKey: key.apiKey, system: prompt.system, user: prompt.user, json: true });
    const parsed = parseStoryboard(text, sceneCount);
    if (!parsed) return errorJson(`AI 응답 형식이 맞지 않습니다(${sceneCount}장면 필요). 다시 시도해주세요.`);
    return NextResponse.json(parsed);
  } catch (err) {
    if (err instanceof LlmError) return errorJson(err.message, err.status);
    console.error("storyboard error:", String((err as Error)?.message ?? "").slice(0, 200));
    return errorJson("스토리보드 생성 중 오류가 발생했습니다. 잠시 뒤 다시 시도해주세요.", 500);
  }
}
