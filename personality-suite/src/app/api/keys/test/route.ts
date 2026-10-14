import { NextResponse, type NextRequest } from "next/server";
import { fail, guardAi, json } from "@/lib/aiRoute";
import { generatePlain } from "@/lib/gemini";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;

/** 등록한 Gemini 키가 실제로 동작하는지 가장 작은 호출 1회로 확인한다(본인 키 사용량 1회). */
export async function POST(request: NextRequest) {
  const g = await guardAi(request);
  if (g instanceof NextResponse) return g;
  try {
    await generatePlain({ apiKey: g.apiKey, system: "한 단어로만 답하세요.", user: "연결 확인: '확인'이라고만 답하세요.", maxOutputTokens: 2048 });
    return json({ ok: true, message: "Gemini 키가 정상 동작합니다." });
  } catch (e) {
    return fail(e);
  }
}
