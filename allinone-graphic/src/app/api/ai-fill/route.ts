import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUserGeminiApiKey } from "@/lib/apiKeys";
import { parseReferenceToFields } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const apiKey = await getUserGeminiApiKey(user.id);
  if (!apiKey) {
    return NextResponse.json(
      { error: "본인의 Gemini API 키를 먼저 등록해주세요." },
      { status: 400 }
    );
  }

  try {
    const { referenceContent, fields } = await req.json();
    if (!referenceContent || !fields || !Array.isArray(fields)) {
      return NextResponse.json({ error: "참고 문서 내용과 필드 정보가 필요합니다." }, { status: 400 });
    }

    const filledValues = await parseReferenceToFields(apiKey, referenceContent, fields);
    return NextResponse.json({
      success: true,
      values: filledValues,
    });
  } catch (err: unknown) {
    console.error("AI Fill error:", err);
    const message = err instanceof Error ? err.message : "필드 자동 채우기 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
