import { NextRequest, NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserGeminiApiKey } from "@/lib/apiKeys";
import { GoogleGenAI } from "@google/genai";
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

    const ai = new GoogleGenAI({ apiKey: userApiKey });

    // [이미지 모델 교체 2026-10-17] 1차 gemini-3-pro-image → gemini-3-pro-image, 2차 종료된 Imagen 3 → gemini-nano-banana-2.1,
    // 기준: ai-image-studio v1.11. 실제 이미지 생성 시험은 하지 않았음 — 이미지 생성 오류가 나면 그때 테스트 검증한다(주인님 지시).
    let lastError: unknown = null;
    for (const model of ["gemini-3-pro-image", "gemini-nano-banana-2.1"]) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: { parts: [{ text: promptText }] },
          config: {
            responseModalities: ["IMAGE"],
            imageConfig: {
              aspectRatio: "1:1",
              imageSize: "1K",
            },
          },
        });

        for (const part of response.candidates?.[0]?.content?.parts ?? []) {
          if (part.inlineData?.data) {
            return NextResponse.json({
              success: true,
              imageBase64: part.inlineData.data,
            });
          }
        }
      } catch (modelErr: any) {
        lastError = modelErr;
        console.warn(`${model} 시도 실패:`, modelErr?.message);
      }
    }
    if (lastError) {
      throw new Error("이미지 생성 실패: " + ((lastError as any)?.message || "알 수 없는 오류"));
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
