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

    // 1차 시도: gemini-3-pro-image-preview
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-pro-image-preview",
        contents: { parts: [{ text: promptText }] },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
            imageSize: "1K",
          },
        },
      });

      const candidates = response.candidates;
      if (candidates && candidates[0]?.content?.parts) {
        for (const part of candidates[0].content.parts) {
          if (part.inlineData?.data) {
            return NextResponse.json({
              success: true,
              imageBase64: part.inlineData.data,
            });
          }
        }
      }
    } catch (proErr: any) {
      console.warn("gemini-3-pro-image-preview 시도 실패, imagen-3.0으로 폴백:", proErr?.message);
    }

    // 2차 폴백: imagen-3.0-generate-002
    try {
      const imagenResponse = await ai.models.generateImages({
        model: "imagen-3.0-generate-002",
        prompt: promptText,
        config: {
          numberOfImages: 1,
          aspectRatio: "1:1",
          outputMimeType: "image/png",
        },
      });

      if (imagenResponse.generatedImages && imagenResponse.generatedImages[0]?.image?.imageBytes) {
        return NextResponse.json({
          success: true,
          imageBase64: imagenResponse.generatedImages[0].image.imageBytes,
        });
      }
    } catch (imgErr: any) {
      console.error("Imagen-3.0 폴백 실패:", imgErr?.message);
      throw new Error("이미지 생성 실패: " + (imgErr.message || "알 수 없는 오류"));
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
