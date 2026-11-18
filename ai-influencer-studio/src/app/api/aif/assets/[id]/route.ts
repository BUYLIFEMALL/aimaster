import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { AIF_ASSETS_MODE } from "@/lib/assets/generation";
import { ASSET_BUCKET } from "@/lib/assets/paths";
import { handleGetAsset } from "@/lib/assets/read";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// GET /api/aif/assets/[id] — 본인 원본 자산의 짧은 서명 URL (W01-A1, 2026-11-18). 처리 순서·보수 축소 사유는 src/lib/assets/read.ts.
// 원본 저장 모드(AIF_ASSETS_MODE)는 서버 상수이고 지금은 "off" — off에서는 권한 확인 뒤 404이며 아래 getReadDeps가 불리지 않는다(자산용 DB·저장소 호출 0).
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await handleGetAsset(
    {
      mode: AIF_ASSETS_MODE,
      checkAccess: checkProgramAccessApi,
      // shadow일 때만 실행 시점에 만든다(지연 생성). 본인 행은 id와 user_id를 둘 다 조건으로 조회한다.
      getReadDeps: () => {
        const admin = createAdminClient();
        return {
          storageOrigin: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",   // 서명 URL이 우리 프로젝트 저장소 주소인지 대조(없으면 503)
          getAssetRow: (userId, assetId) =>
            admin.from("aif_assets").select("id, user_id, state, bucket, path, object_id, mime, bytes").eq("id", assetId).eq("user_id", userId).maybeSingle(),
          createSignedUrl: (path, expiresIn) => admin.storage.from(ASSET_BUCKET).createSignedUrl(path, expiresIn),
        };
      },
    },
    id,
  );
  return NextResponse.json(r.body, { status: r.status, headers: r.headers });
}
