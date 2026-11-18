import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { AIF_ASSETS_MODE } from "@/lib/assets/generation";
import { ASSET_BUCKET } from "@/lib/assets/paths";
import { handlePostAsset } from "@/lib/assets/upload";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// POST /api/aif/assets — 회원이 올린 참고 이미지 한 장을 서버가 받아 비공개 자산으로 저장 (W01-A2I, 2026-11-19). 처리 순서·한계는 src/lib/assets/upload.ts.
// ★ 지금은 아무것도 저장하지 않는다: 원본 저장 모드(AIF_ASSETS_MODE)가 서버 상수 "off"라 권한 확인 뒤 404만 돌려주고,
//   본문을 읽지 않으며 아래 getAssetDeps도 불리지 않는다(관리자 클라이언트·DB·저장소 호출 0). 이 경로를 부르는 화면도 아직 없다.
// 회원 로그인·이용권을 확인한 뒤 서비스 키로 저장한다(회원은 표·버킷에 직접 쓸 권한이 없다). AI·외부 계정 호출 없음.
export async function POST(req: Request) {
  const r = await handlePostAsset(req, {
    mode: AIF_ASSETS_MODE,
    checkAccess: checkProgramAccessApi,
    // shadow일 때, 본문 검사를 통과한 뒤에만 실행 시점에 만든다(지연 생성)
    getAssetDeps: () => {
      const admin = createAdminClient();
      return { rpc: (fn, args) => admin.rpc(fn, args), storage: admin.storage.from(ASSET_BUCKET) };
    },
  });
  return NextResponse.json(r.body, { status: r.status, headers: r.headers });
}
