import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUserGeminiApiKey } from "@/lib/apiKeys";
import { checkProgramAccess } from "@/lib/programAccess";
import { generateGraphicImage, GenerateOptions, ImageReference } from "@/lib/gemini";
import { PROGRAM_SLUG } from "@/lib/version";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  // 이용 권한 검사
  const hasAccess = await checkProgramAccess(user.id, PROGRAM_SLUG);
  if (!hasAccess) {
    return NextResponse.json(
      { error: "프로그램 이용 권한이 없습니다. 이용권 또는 관리자 승인이 필요합니다." },
      { status: 403 }
    );
  }

  // ★ 최상위 절대 규칙: 회원 본인 API 키 직접 사용
  const apiKey = await getUserGeminiApiKey(user.id);
  if (!apiKey) {
    return NextResponse.json(
      { error: "본인의 Gemini API 키가 등록되지 않았습니다. 좌측 사이드바 'API키 등록'에서 본인 키를 먼저 연동해주세요." },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const { prompt, options, referenceImages, modelTier } = body as {
      prompt: string;
      options: GenerateOptions;
      referenceImages?: ImageReference[];
      modelTier?: "standard" | "pro";
    };

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ error: "프롬프트 내용이 없습니다." }, { status: 400 });
    }

    const imageUrl = await generateGraphicImage(
      apiKey,
      prompt.trim(),
      options || { aspectRatio: "1:1" },
      referenceImages || [],
      modelTier || "standard"
    );

    return NextResponse.json({
      success: true,
      imageUrl,
    });
  } catch (err: unknown) {
    console.error("Generate error:", err);
    const message = err instanceof Error ? err.message : "이미지 생성 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
