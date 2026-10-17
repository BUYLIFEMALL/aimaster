import { NextRequest, NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserGeminiApiKey } from "@/lib/apiKeys";

// v1.10: Google Imagen(imagen-3.0-generate-002)이 2025-11-10 종료되어 Nano Banana 2.1(gemini-nano-banana-2.1, 2026-10-06 정식)로 교체.
// gemini-2.5-flash-image는 공식 가격표에 2026-10-02 종료 예정 구형으로 표시돼 쓰지 않는다(2026-10-17 주인님 결정).
// 호출 방식은 ai-image-studio/lib/providers/adapters/gemini.ts와 같게 REST generateContent + imageConfig.
const IMAGE_MODEL = "gemini-nano-banana-2.1";
/** 화질 — 기본 2K(영상 배경용, 장당 약 $0.050). 1K(약 $0.034)는 더 싸게 쓰거나 시험할 때만 */
const ALLOWED_SIZES = ["1K", "2K"] as const;
type ImageSize = (typeof ALLOWED_SIZES)[number];
const IMAGE_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_MODEL}:generateContent`;
const KOREAN_DEFAULT_PEOPLE_INSTRUCTION =
  "If this scene includes any human figures, depict them as Korean/East Asian people by default. Only depict a different ethnicity/nationality if the prompt explicitly names a specific foreign celebrity, politician, entertainer, or athlete, or explicitly describes a foreign country/setting.";

interface GeminiImagePart { inlineData?: { data?: string; mimeType?: string } }

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;

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

    const res = await fetch(`${IMAGE_ENDPOINT}?key=${encodeURIComponent(userApiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${promptText}

${KOREAN_DEFAULT_PEOPLE_INSTRUCTION}` }] }],
        generationConfig: {
          responseModalities: ["IMAGE"],
          imageConfig: { aspectRatio: "16:9", imageSize },
          temperature: 0.7,
        },
      }),
    });

    if (!res.ok) {
      // 회원에게는 원인만 짧게 — 키 값이 들어갈 수 있는 요청 주소는 남기지 않는다
      const errBody = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      const reason = errBody?.error?.message || `HTTP ${res.status}`;
      const hint =
        res.status === 429 ? " (본인 Google 계정의 이미지 생성 한도에 걸렸습니다. 잠시 후 다시 시도하거나 결제 설정을 확인해 주세요.)"
        : res.status === 400 || res.status === 403 ? " (본인 Gemini API 키와 결제 설정을 확인해 주세요.)"
        : "";
      throw new Error(`AI 배경 생성 실패: ${reason}${hint}`);
    }

    const data = (await res.json()) as { candidates?: { content?: { parts?: GeminiImagePart[] } }[] };
    const imagePart = data.candidates?.[0]?.content?.parts?.find((part) => part.inlineData?.data);
    if (!imagePart?.inlineData?.data) {
      throw new Error("이미지 생성 응답에 이미지 데이터가 없습니다. 다른 분위기 문구로 다시 시도해 주세요.");
    }

    const base64Data = imagePart.inlineData.data.replace(/\s+/g, "");
    const mimeType = imagePart.inlineData.mimeType || "image/png";
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
      { status: 500 }
    );
  }
}
