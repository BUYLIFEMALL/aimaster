import { NextRequest, NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserGeminiApiKey } from "@/lib/apiKeys";
import { GoogleGenAI } from "@google/genai";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

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
    const { title, artist, extraInfo, mediaType } = body;

    const mediaLabel = mediaType === "vinyl" ? "Vinyl LP Record" : "Compact Disc (CD)";

    const prompt = `
Act as an expert creative art director for music albums and vinyl records.
Generate a concise, creative, and visually evocative art style description for a ${mediaLabel} cover based on:

Album Title: "${title || "Untitled"}"
Artist: "${artist || "Unknown"}"
Genre/Context: "${extraInfo || "Music"}"

Requirements:
1. Output ONLY the visual description string in English.
2. 1-2 sentences maximum.
3. Focus on specific visual textures, lighting, color palette, mood, and artistic medium (e.g. oil painting, retro anime, neon cyberpunk, 35mm film grain, 70s psychedelic).
4. Do NOT output markdown or explanations. Just the prompt string.
`;

    const ai = new GoogleGenAI({ apiKey: userApiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const suggestedPrompt = response.text ? response.text.trim() : "";

    return NextResponse.json({
      success: true,
      prompt: suggestedPrompt,
    });
  } catch (err: any) {
    console.error("[suggest-style error]:", err);
    return NextResponse.json(
      { error: err.message || "스타일 추천 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
