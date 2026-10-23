import { NextResponse, type NextRequest } from "next/server";
import { fail, guardAi, json } from "@/lib/aiRoute";
import { generateImage } from "@/lib/gemini";
import { buildCharacterPrompt } from "@/lib/comic/prompt";
import { parseCharacterRequest } from "@/lib/comic/validate";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300; // 2026-10-18: Pro 이미지 모델 시간 초과 방지(60 → 300초)

/** 등장인물 한 명의 전신 캐릭터 시트 1장. 회원 본인 Gemini 키 1회 호출, 결과는 서버에 저장하지 않는다. */
export async function POST(request: NextRequest) {
  const g = await guardAi(request, 20_000);
  if (g instanceof NextResponse) return g;
  const parsed = parseCharacterRequest(g.body);
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  const prompt = buildCharacterPrompt({ name: parsed.value.name, description: parsed.value.description, styleId: parsed.value.styleId });
  if (!prompt) return json({ error: "그림 스타일이 올바르지 않습니다." }, 400);
  try {
    const image = await generateImage({ apiKey: g.apiKey, model: parsed.value.model, prompt });
    return json({ image });
  } catch (e) {
    return fail(e);
  }
}
