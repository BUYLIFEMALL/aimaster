import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserGeminiApiKey } from "@/lib/apiKeys";
import { planInfluencerDay } from "@/lib/gemini";
import { checkTextInputs } from "@/lib/textOutput";
import { readJsonObject, textErrorResponse } from "@/lib/textRoute";

export const maxDuration = 30;

export async function POST(req: Request) {
  const auth = await checkProgramAccessApi();
  if (!auth.allowed) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const apiKey = await getUserGeminiApiKey(auth.user.id);
  if (!apiKey) {
    return NextResponse.json(
      {
        error: "Google Gemini API 키가 등록되어 있지 않습니다.",
        needApiKey: true,
      },
      { status: 400 }
    );
  }

  try {
    const body = await readJsonObject(req);
    if (!body) return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
    const { routinePrompt, persona } = body;

    if (typeof routinePrompt !== "string" || !routinePrompt.trim()) {
      return NextResponse.json({ error: "일과 내용을 입력해주세요." }, { status: 400 });
    }
    // 2026-11-20(R2 3단계): 입력 길이를 호출 전에 확인한다
    const input = checkTextInputs({ routinePrompt, persona });
    if (!input.ok) return NextResponse.json({ error: input.message, field: input.field }, { status: 400 });

    // 응답은 서버에서 모양·선택지 값을 검사한 뒤 돌려준다(gemini.ts runPlan)
    const scenarios = await planInfluencerDay(apiKey, routinePrompt, typeof persona === "string" ? persona : "");

    return NextResponse.json({ success: true, scenarios });
  } catch (err: unknown) {
    console.error("Plan Day API Error:", err instanceof Error ? err.name : "unknown");
    return textErrorResponse(err, "일과 플래닝 중 오류가 발생했습니다.");
  }
}
