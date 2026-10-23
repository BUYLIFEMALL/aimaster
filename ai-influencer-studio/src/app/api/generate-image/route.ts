import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserGeminiApiKey } from "@/lib/apiKeys";
import { generateInfluencerImage } from "@/lib/gemini";
import type { InfluencerConfig } from "@/types/influencer";

export const maxDuration = 300; // 2026-10-18: Pro 이미지 모델 시간 초과 방지(60 → 300초)

export async function POST(req: Request) {
  const auth = await checkProgramAccessApi();
  if (!auth.allowed) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const apiKey = await getUserGeminiApiKey(auth.user.id);
  if (!apiKey) {
    return NextResponse.json(
      {
        error: "Google Gemini API 키가 등록되어 있지 않습니다. 우측 상단 'API 키 설정'에서 본인 키를 등록해주세요.",
        needApiKey: true,
      },
      { status: 400 }
    );
  }

  try {
    const config: InfluencerConfig = await req.json();
    const imageUrl = await generateInfluencerImage(apiKey, config);

    return NextResponse.json({ success: true, imageUrl });
  } catch (err: any) {
    console.error("Generate Image API Error:", err);
    return NextResponse.json(
      { error: err.message || "이미지 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
