import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserGeminiApiKey } from "@/lib/apiKeys";
import { generateSceneImage } from "@/lib/detailEngine";
import { ModelType } from "@/types/detail";

export const maxDuration = 60; // 60초 타임아웃

export async function POST(req: Request) {
  const auth = await checkProgramAccessApi();
  if (!auth.allowed || !auth.user) {
    return NextResponse.json({ error: auth.error || "로그인이 필요합니다." }, { status: auth.status || 401 });
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
    const { prompt, modelType, referenceImages } = await req.json();

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ error: "이미지 프롬프트가 누락되었습니다." }, { status: 400 });
    }

    const imageUrl = await generateSceneImage(
      userApiKey,
      prompt,
      (modelType || "nano-banana") as ModelType,
      referenceImages
    );

    return NextResponse.json({ success: true, imageUrl });
  } catch (err: any) {
    console.error("[generate-image] Error:", err);
    return NextResponse.json(
      { error: err.message || "이미지 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
