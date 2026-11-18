import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserGeminiApiKey } from "@/lib/apiKeys";
import { generateInfluencerImage } from "@/lib/gemini";
import { handleGenerateImageRequest } from "@/lib/referenceImage";
import type { InfluencerConfig } from "@/types/influencer";

export const maxDuration = 300; // 2026-10-18: Pro 이미지 모델 시간 초과 방지(60 → 300초)

// 2026-11-18 W01c: 본문을 3MiB까지만 읽고(초과 413), 참고 이미지 형식·크기를 검사한 뒤에만 유료 생성을 부른다 — src/lib/referenceImage.ts
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

  const r = await handleGenerateImageRequest(req, (config) => generateInfluencerImage(apiKey, config as unknown as InfluencerConfig));
  return NextResponse.json(r.body, { status: r.status });
}
