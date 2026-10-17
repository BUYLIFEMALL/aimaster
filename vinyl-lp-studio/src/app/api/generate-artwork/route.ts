import { NextRequest, NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserGeminiApiKey } from "@/lib/apiKeys";
import { GeminiImageError, generateGeminiImage } from "@/lib/geminiImage";
import { MediaType } from "@/types/vinyl";

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
    const { title, artist, extraInfo, backgroundPrompt, mediaType } = body as {
      title: string;
      artist: string;
      extraInfo: string;
      backgroundPrompt: string;
      mediaType: MediaType;
    };

    const mediaDesc =
      mediaType === "vinyl"
        ? "A square album art graphic design. High contrast, circular composition suitable for a vinyl record label."
        : "A flat, square, edge-to-edge CD album artwork design. Full bleed graphic.";

    const promptText = `
${mediaDesc}

The design MUST clearly and aesthetically feature the following text (Support High Quality KOREAN and English characters):
1. Main Title: "${title || "Untitled"}"
2. Artist Name: "${artist || "Unknown"}"
3. Detail Text: "${extraInfo || ""}"

The artistic style is: ${backgroundPrompt || "Abstract modern geometric artwork"}.

CRITICAL INSTRUCTIONS:
1. Generate ONLY the artwork texture itself.
2. NO background room, NO table, NO turntable machine, NO 3D object, NO jewel plastic case.
3. The image must be a flat, edge-to-edge perfect 1:1 square filled entirely by the artwork.
4. **LAYOUT RULE: DO NOT place text in the absolute center (there is a circular cut-out hole in the disc).**
5. Text Placement:
   - Arrange text in a CIRCULAR ARC around the center (curved text alignment), OR
   - Place text horizontally at the TOP or BOTTOM section of the artwork.
   - Ensure text is crisp, legible, and positioned away from the center hole.
`;

    // 2026-10-18: 호출·대기·이미지 받기는 공용 기준 코드 gemini-image-client(@/lib/geminiImage — 기준은 ai-image-studio).
    // 함수 한도 60초 → 두 모델 합쳐 50초 안(마감 시각 방식), 유료 생성이라 재시도 없음.
    // 예전에는 어떤 오류든 다음 모델로 다시 요청했으나(시간 초과 뒤 재요청 → 이중 과금 위험), 이제 "모델 없음·이미지 안 나옴"일 때만
    // 다음 모델로 넘어간다. 그 밖의 오류는 원인별 한국어 안내(키 가림)를 그대로 보여 준다. 모델·비율·화질·프롬프트는 그대로.
    const deadline = Date.now() + 50_000;
    let lastError: GeminiImageError | null = null;
    for (const model of ["gemini-3-pro-image", "gemini-nano-banana-2.1"]) {
      const remaining = deadline - Date.now();
      if (remaining < 10_000) break;
      try {
        const image = await generateGeminiImage({
          apiKey: userApiKey,
          modelName: model,
          prompt: promptText,
          aspectRatio: "1:1",
          imageSize: "1K",
          timeoutMs: remaining,
          retries: 0,
        });
        return NextResponse.json({ success: true, imageBase64: image.base64 });
      } catch (modelErr: any) {
        if (!(modelErr instanceof GeminiImageError)) throw modelErr;
        lastError = modelErr;
        console.warn(`${model} 시도 실패:`, modelErr.code, modelErr.message);
        if (modelErr.code !== "MODEL_NOT_FOUND" && modelErr.code !== "NO_IMAGE") break;
      }
    }
    if (lastError) {
      return NextResponse.json({ error: lastError.message }, { status: lastError.status });
    }

    throw new Error("이미지 데이터가 생성되지 않았습니다.");
  } catch (err: any) {
    console.error("[generate-artwork error]:", err);
    return NextResponse.json(
      { error: err.message || "앨범 아트워크 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
