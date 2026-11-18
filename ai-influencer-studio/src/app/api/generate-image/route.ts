import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserGeminiApiKey } from "@/lib/apiKeys";
import { generateInfluencerImage } from "@/lib/gemini";
import { createAdminClient } from "@/lib/supabase/admin";
import { AIF_ASSETS_MODE, handleGenerateImagePost } from "@/lib/assets/generation";
import { ASSET_BUCKET } from "@/lib/assets/paths";
import type { InfluencerConfig } from "@/types/influencer";

export const maxDuration = 300; // 2026-10-18: Pro 이미지 모델 시간 초과 방지(60 → 300초)

// 2026-11-18 W01c: 본문을 3MiB까지만 읽고(초과 413), 참고 이미지 형식·크기를 검사한 뒤에만 유료 생성을 부른다 — src/lib/referenceImage.ts
// 2026-11-18 W01-A1: 처리 순서는 src/lib/assets/generation.ts. 원본 저장 모드(AIF_ASSETS_MODE)는 서버 상수이고 지금은 "off" —
//   off에서는 아래 getAssetDeps가 불리지 않아 관리자 클라이언트·저장소·DB 함수 호출이 생기지 않고, 응답은 예전과 같다.
export async function POST(req: Request) {
  const r = await handleGenerateImagePost(req, {
    mode: AIF_ASSETS_MODE,
    checkAccess: checkProgramAccessApi,
    getApiKey: getUserGeminiApiKey,
    generate: (apiKey, config) => generateInfluencerImage(apiKey, config as unknown as InfluencerConfig),
    // shadow일 때만 실행 시점에 만든다(지연 생성)
    getAssetDeps: () => {
      const admin = createAdminClient();
      return { rpc: (fn, args) => admin.rpc(fn, args), storage: admin.storage.from(ASSET_BUCKET) };
    },
  });
  return NextResponse.json(r.body, { status: r.status });
}
