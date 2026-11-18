import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserGeminiApiKey } from "@/lib/apiKeys";
import { generateInfluencerImage } from "@/lib/gemini";
import { createAdminClient } from "@/lib/supabase/admin";
import { AIF_ASSETS_MODE } from "@/lib/assets/generation";
import { handlePostGeneration } from "@/lib/assets/generations";
import { ASSET_BUCKET } from "@/lib/assets/paths";
import type { InfluencerConfig } from "@/types/influencer";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300; // 생성 호출 240초 + 참고 자산 읽기·사전 검사·저장·서명(src/lib/assets/generations.ts의 시간 예산 합계 295초)

// POST /api/aif/generations — 참고 이미지를 자산 번호로 받아 생성 (W01-G3I, 2026-11-19). 처리 순서·한계는 src/lib/assets/generations.ts.
// ★ 지금은 생성하지 않는다: 원본 저장 모드(AIF_ASSETS_MODE)가 서버 상수 "off"라 권한 확인 뒤 404만 돌려주고,
//   본인 키 조회·본문 읽기·아래 getAssetDeps·생성 호출이 일어나지 않는다. 이 경로를 부르는 화면도 아직 없다(기존 /api/generate-image가 그대로 쓰인다).
// AI 키는 회원 본인 Gemini 키만 쓴다(getUserGeminiApiKey — 없으면 등록 안내, 다른 키로 대신하지 않는다).
export async function POST(req: Request) {
  const r = await handlePostGeneration(req, {
    mode: AIF_ASSETS_MODE,
    checkAccess: checkProgramAccessApi,
    getApiKey: getUserGeminiApiKey,
    generate: (apiKey, config) => generateInfluencerImage(apiKey, config as unknown as InfluencerConfig),
    // shadow일 때, 요청 모양 검사를 통과한 뒤에만 실행 시점에 만든다(지연 생성)
    getAssetDeps: () => {
      const admin = createAdminClient();
      const bucket = admin.storage.from(ASSET_BUCKET);
      return {
        storageOrigin: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
        rpc: (fn, args) => admin.rpc(fn, args),
        storage: bucket,
        // 본인 행만: id와 user_id를 둘 다 조건으로 조회한다
        getAssetRow: (userId, assetId) =>
          admin.from("aif_assets").select("id, user_id, kind, state, bucket, path, mime, bytes, sha256").eq("id", assetId).eq("user_id", userId).maybeSingle(),
        // 스트림으로 받는다(받는 쪽이 실제 바이트를 세며 상한에서 끊는다). signal이 끊기면 요청을 멈춘다
        downloadStream: (path, signal) => bucket.download(path, {}, { signal }).asStream(),
        createSignedUrl: (path, expiresIn) => bucket.createSignedUrl(path, expiresIn),
      };
    },
  });
  return NextResponse.json(r.body, { status: r.status, headers: r.headers });
}
