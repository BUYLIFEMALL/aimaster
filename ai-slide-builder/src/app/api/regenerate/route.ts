import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { checkProgramAccess } from "@/lib/programAccess";
import { getUserGeminiApiKey } from "@/lib/apiKeys";
import { regenerateSlideWithGemini } from "@/lib/gemini";
import { PROGRAM_SLUG } from "@/lib/version";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const hasAccess = await checkProgramAccess(user.id, PROGRAM_SLUG);
    if (!hasAccess) {
      return NextResponse.json({ error: "프로그램 이용 권한이 없습니다." }, { status: 403 });
    }

    const apiKey = await getUserGeminiApiKey(user.id);
    if (!apiKey) {
      return NextResponse.json(
        { error: "등록된 Gemini API 키가 없습니다. 본인의 API 키를 등록해주세요." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { slide, userRequest } = body;

    if (!slide || !userRequest || !userRequest.trim()) {
      return NextResponse.json(
        { error: "슬라이드 데이터 또는 수정 요청 내용이 부족합니다." },
        { status: 400 }
      );
    }

    const updatedSlide = await regenerateSlideWithGemini(apiKey, slide, userRequest);
    return NextResponse.json({ slide: updatedSlide });
  } catch (error: any) {
    console.error("API /api/regenerate error:", error);
    return NextResponse.json(
      { error: error.message || "슬라이드 수정 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
