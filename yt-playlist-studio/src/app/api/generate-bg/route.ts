import { NextRequest, NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserGeminiApiKey } from "@/lib/apiKeys";
import { GoogleGenAI } from "@google/genai";

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
    const { moodPrompt, customPrompt } = body as {
      moodPrompt: string;
      customPrompt?: string;
    };

    const finalStyle = customPrompt?.trim() || moodPrompt || "Aesthetic Lo-fi Cozy Cafe Night with Rain on Window";

    const promptText = `
A photorealistic, highly aesthetic 16:9 widescreen wallpaper for a YouTube music playlist video.
Atmosphere and Theme: ${finalStyle}.
Visual Style: Cinematic lighting, professional photography, soft ambient glow, cozy warm colors, highly detailed, 8k resolution, cinematic composition.
NO typography, NO letters, NO text, NO watermarks, edge-to-edge wallpaper background.
`.trim();

    const ai = new GoogleGenAI({ apiKey: userApiKey });

    const response = await ai.models.generateImages({
      model: "imagen-3.0-generate-002",
      prompt: promptText,
      config: {
        numberOfImages: 1,
        aspectRatio: "16:9",
        outputMimeType: "image/jpeg",
      },
    });

    const generatedImage = response.generatedImages?.[0];
    if (!generatedImage?.image?.imageBytes) {
      throw new Error("이미지 생성 응답에 이미지 데이터가 없습니다.");
    }

    const base64Data = Buffer.from(generatedImage.image.imageBytes, "base64").toString("base64");
    const dataUrl = `data:image/jpeg;base64,${base64Data}`;

    return NextResponse.json({
      success: true,
      imageUrl: dataUrl,
      prompt: promptText,
    });
  } catch (err: any) {
    console.error("AI Background Generation Error:", err);
    return NextResponse.json(
      { error: err?.message || "AI 배경 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
