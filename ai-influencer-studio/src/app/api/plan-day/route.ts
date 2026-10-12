import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserGeminiApiKey } from "@/lib/apiKeys";
import { planInfluencerDay } from "@/lib/gemini";

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
    const { routinePrompt, persona }: { routinePrompt: string; persona?: string } =
      await req.json();

    if (!routinePrompt?.trim()) {
      return NextResponse.json({ error: "일과 내용을 입력해주세요." }, { status: 400 });
    }

    const scenarios = await planInfluencerDay(apiKey, routinePrompt, persona || "");

    return NextResponse.json({ success: true, scenarios });
  } catch (err: any) {
    console.error("Plan Day API Error:", err);
    return NextResponse.json(
      { error: err.message || "일과 플래닝 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
