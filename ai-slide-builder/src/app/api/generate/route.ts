import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { checkProgramAccess } from "@/lib/programAccess";
import { getUserGeminiApiKey } from "@/lib/apiKeys";
import { getGeminiSlideResponse } from "@/lib/gemini";
import { PROGRAM_SLUG } from "@/lib/version";
import { PromptFormat } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다. AIMaster 계정으로 로그인해주세요." },
        { status: 401 }
      );
    }

    const hasAccess = await checkProgramAccess(user.id, PROGRAM_SLUG);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "해당 프로그램의 이용 권한 또는 사용기간이 만료되었습니다." },
        { status: 403 }
      );
    }

    const apiKey = await getUserGeminiApiKey(user.id);
    if (!apiKey) {
      return NextResponse.json(
        { error: "등록된 Gemini API 키가 없습니다. 좌측 상단에서 본인의 Gemini API 키를 먼저 등록해주세요." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { prompt, format = "standard", useWebSearch = false } = body;

    if (!prompt || !prompt.trim()) {
      return NextResponse.json(
        { error: "프레젠테이션 생성을 위한 입력 내용이 없습니다." },
        { status: 400 }
      );
    }

    const result = await getGeminiSlideResponse(
      apiKey,
      prompt,
      format as PromptFormat,
      !!useWebSearch
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("API /api/generate error:", error);
    return NextResponse.json(
      { error: error.message || "슬라이드 생성 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
