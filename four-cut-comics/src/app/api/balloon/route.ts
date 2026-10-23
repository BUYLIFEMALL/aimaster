import { NextResponse, type NextRequest } from "next/server";
import { fail, guardAi, json } from "@/lib/aiRoute";
import { generateVisionJson } from "@/lib/gemini";
import { buildBalloonPrompt } from "@/lib/comic/prompt";
import { defaultBalloon, parseBalloonAi } from "@/lib/comic/balloon";
import { NO_SPEAKER, THOUGHT_SPEAKER } from "@/lib/comic/options";
import { extractJson } from "@/lib/comic/script";
import { MAX_SHEET_B64, parseBalloonRequest } from "@/lib/comic/validate";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;

/**
 * 완성된 컷 1장의 말풍선 위치·꼬리·모양. 본인 Gemini 키(텍스트 모델) 1회 호출.
 * AI 응답을 해석하지 못하면 오류 대신 기본 위치(컷 상단 중앙)를 fallback:true로 돌려준다. 그림은 저장하지 않는다.
 */
export async function POST(request: NextRequest) {
  const g = await guardAi(request, MAX_SHEET_B64 + 10_000);
  if (g instanceof NextResponse) return g;
  const parsed = parseBalloonRequest(g.body);
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  const v = parsed.value;
  const panel = { character: v.character || NO_SPEAKER, dialogue: v.dialogue };
  const prompt = buildBalloonPrompt({
    dialogue: v.dialogue, speaker: v.character,
    thought: v.character === THOUGHT_SPEAKER, narration: !v.character || v.character === NO_SPEAKER,
  });
  try {
    const text = await generateVisionJson({ apiKey: g.apiKey, prompt, image: v.image });
    const balloon = parseBalloonAi(extractJson(text), panel);
    return balloon ? json({ balloon, fallback: false }) : json({ balloon: defaultBalloon(panel), fallback: true });
  } catch (e) {
    return fail(e);
  }
}
