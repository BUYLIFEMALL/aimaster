import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserGeminiApiKey } from "@/lib/apiKeys";
import { generateMetaPrompt } from "@/lib/prompt-engine";
import { PromptFormData } from "@/types/prompt";

export async function POST(req: Request) {
  const auth = await checkProgramAccessApi();
  if (!auth.allowed) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // 최상위 절대 규칙: 본인 API 키 사용
  const userApiKey = await getUserGeminiApiKey(auth.user.id);
  if (!userApiKey) {
    return NextResponse.json(
      {
        error: "본인의 Gemini API 키가 등록되지 않았습니다. 좌측 메뉴의 '🔑 API키등록·플랫폼연동'에서 본인 API 키를 먼저 등록해주세요.",
        needApiKey: true,
      },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const formData = body as PromptFormData;

    if (!formData.goal || !formData.goal.trim()) {
      return NextResponse.json({ error: "목표 또는 원문 내용을 입력해주세요." }, { status: 400 });
    }

    const result = await generateMetaPrompt(userApiKey, formData);
    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    console.error("[generate-prompt] Error:", err);
    return NextResponse.json(
      { error: err.message || "프롬프트 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
