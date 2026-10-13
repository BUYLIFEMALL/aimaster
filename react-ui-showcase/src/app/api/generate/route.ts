import { NextRequest, NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserGeminiApiKey } from "@/lib/apiKeys";
import { generateCustomComponent } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const access = await checkProgramAccessApi();
    if (!access.allowed || !access.user) {
      return NextResponse.json({ error: access.error || "권한이 없습니다." }, { status: access.status || 401 });
    }

    const body = await req.json();
    const { prompt, componentType, apiKey: directKey } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "프롬프트를 입력해주세요." }, { status: 400 });
    }

    let apiKey = directKey;

    // 전달된 키가 없으면 DB에서 본인 키 조회
    if (!apiKey) {
      apiKey = await getUserGeminiApiKey(access.user.id);
    }

    // 최상위 규칙: 운영자 키 폴백 금지, 본인 키 없을 시 안내
    if (!apiKey) {
      return NextResponse.json(
        { 
          error: "Gemini API 키가 등록되지 않았습니다. 사이드바의 [API키등록·플랫폼연동] 메뉴에서 본인의 Google Gemini API 키를 먼저 등록해주세요." 
        }, 
        { status: 400 }
      );
    }

    const code = await generateCustomComponent(apiKey, prompt, componentType);
    return NextResponse.json({ success: true, code });
  } catch (error: any) {
    console.error("AI Component Generation Error:", error);
    return NextResponse.json({ error: error.message || "컴포넌트 생성 중 오류가 발생했습니다." }, { status: 500 });
  }
}
