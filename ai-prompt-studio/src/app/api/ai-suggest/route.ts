import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserGeminiApiKey } from "@/lib/apiKeys";
import { generateFieldSuggestion, SuggestType } from "@/lib/prompt-engine";

export async function POST(req: Request) {
  const auth = await checkProgramAccessApi();
  if (!auth.allowed) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // 본인 Gemini API 키 확인
  const userApiKey = await getUserGeminiApiKey(auth.user.id);
  if (!userApiKey) {
    return NextResponse.json(
      {
        error: "본인의 Gemini API 키가 필요합니다. 좌측 메뉴에서 API 키를 등록해주세요.",
        needApiKey: true,
      },
      { status: 400 }
    );
  }

  try {
    const { type, context } = (await req.json()) as {
      type: SuggestType;
      context: { goal: string; role?: string; task?: string };
    };

    if (!type || !context || !context.goal?.trim()) {
      return NextResponse.json({ error: "필수 정보(목표 등)를 입력해주세요." }, { status: 400 });
    }

    const suggestion = await generateFieldSuggestion(userApiKey, type, context);
    return NextResponse.json({ success: true, suggestion });
  } catch (err: any) {
    console.error("[ai-suggest] Error:", err);
    return NextResponse.json(
      { error: err.message || "AI 제안 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
