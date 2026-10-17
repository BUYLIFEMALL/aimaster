import { NextRequest, NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserGeminiApiKey } from "@/lib/apiKeys";
import { GeminiImageError, generateGeminiImage } from "@/lib/geminiImage";

// v1.10: Google Imagen(imagen-3.0-generate-002)이 2025-11-10 종료되어 Nano Banana 2.1(gemini-nano-banana-2.1, 2026-10-06 정식)로 교체.
// gemini-2.5-flash-image는 공식 가격표에 2026-10-02 종료 예정 구형으로 표시돼 쓰지 않는다(2026-10-17 주인님 결정).
// 호출 방식은 ai-image-studio/lib/providers/adapters/gemini.ts와 같게 REST generateContent + imageConfig.
// 2026-10-17 정정: 이미지 프롬프트·생성 스타일은 기존값 유지(주인님 지시) — v1.10에서 덧붙였던 인물 지시문·temperature 제거.
// 실제 이미지 생성 재시험은 하지 않았음 — 이미지 생성 오류가 나면 그때 테스트 검증한다.
const IMAGE_MODEL = "gemini-nano-banana-2.1";
/** 화질 — 기본 2K(영상 배경용, 장당 약 $0.050). 1K(약 $0.034)는 더 싸게 쓰거나 시험할 때만 */
const ALLOWED_SIZES = ["1K", "2K"] as const;
type ImageSize = (typeof ALLOWED_SIZES)[number];

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300; // 2026-10-18: Pro 이미지 모델 시간 초과 방지(60 → 300초)

export async function POST(req: NextRequest) {
  try {
    const authResult = await checkProgramAccessApi();
    if (!authResult.allowed) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const userId = authResult.user.id;
    const userApiKey = await getUserGeminiApiKey(userId);

    if (!userApiKey) {
      return NextResponse.json(
        {
          error: "등록된 Gemini API 키가 없습니다. 좌측 메뉴의 '🔑 API키등록·플랫폼연동'에서 본인 API 키를 먼저 등록해 주세요.",
          needKey: true,
        },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { moodPrompt, customPrompt, imageSize: requestedSize } = body as {
      moodPrompt: string;
      customPrompt?: string;
      imageSize?: string;
    };
    const imageSize: ImageSize = (ALLOWED_SIZES as readonly string[]).includes(requestedSize ?? "") ? (requestedSize as ImageSize) : "2K";

    const finalStyle = customPrompt?.trim() || moodPrompt || "Aesthetic Lo-fi Cozy Cafe Night with Rain on Window";

    const promptText = `
A photorealistic, highly aesthetic 16:9 widescreen wallpaper for a YouTube music playlist video.
Atmosphere and Theme: ${finalStyle}.
Visual Style: Cinematic lighting, professional photography, soft ambient glow, cozy warm colors, highly detailed, 8k resolution, cinematic composition.
NO typography, NO letters, NO text, NO watermarks, edge-to-edge wallpaper background.
`.trim();

    // 2026-10-18: 호출·대기·이미지 받기는 공용 기준 코드 gemini-image-client(@/lib/geminiImage — 기준은 ai-image-studio).
    // 키는 주소가 아니라 머리글로 보낸다. 함수 한도 300초(2026-10-18 60초에서 상향) → 시간 제한 240초, 유료 생성이라 재시도 없음(이중 과금 방지).
    // 실패하면 원인별 한국어 안내(키 가림)를 그대로 보여 준다. 모델·비율·화질·프롬프트는 그대로.
    const image = await generateGeminiImage({
      apiKey: userApiKey,
      modelName: IMAGE_MODEL,
      prompt: promptText,
      aspectRatio: "16:9",
      imageSize,
      timeoutMs: 240_000,
      retries: 0,
    });
    const base64Data = image.base64;
    const mimeType = image.mimeType || "image/png";
    const dataUrl = `data:${mimeType};base64,${base64Data}`;

    return NextResponse.json({
      success: true,
      imageUrl: dataUrl,
      prompt: promptText,
      model: IMAGE_MODEL,
      imageSize,
    });
  } catch (err: unknown) {
    console.error("AI Background Generation Error:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: (err instanceof Error && err.message) || "AI 배경 생성 중 오류가 발생했습니다." },
      { status: err instanceof GeminiImageError ? err.status : 500 }
    );
  }
}
