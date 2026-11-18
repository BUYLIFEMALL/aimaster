import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadRetentionExemptIdsStrict } from "@/lib/retentionExempt";
import { AIF_ASSETS_MODE } from "@/lib/assets/generation";
import { ASSET_BUCKET } from "@/lib/assets/paths";
import { handleCleanupRequest } from "@/lib/assets/retention";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

// GET /api/aif/assets/cleanup — 일반 회원의 기간 지난 원본 자산 보관 정리 (W01-R1, 2026-11-18). 처리 규칙·한계는 src/lib/assets/retention.ts.
// ★ 지금은 아무 일도 하지 않는다: 원본 저장 모드(AIF_ASSETS_MODE)가 서버 상수 "off"라 인증 뒤 { skipped: true }만 돌려주고,
//   아래 getDeps는 불리지 않는다(관리자 클라이언트·DB·저장소 호출 0). 예약 실행(vercel.json crons)도 등록하지 않았다 — 운영 ON 승인 때 함께 한다.
// 인증: `Authorization: Bearer <CRON_SECRET>` 한 가지(주소의 ?secret= 은 받지 않는다). 비밀값이 없거나 짧으면 모든 요청이 401.
// 회원 로그인·회원 키를 쓰지 않는 운영 정리 작업이다(AI·외부 계정 호출 없음).
export async function GET(req: Request) {
  const r = await handleCleanupRequest({
    mode: AIF_ASSETS_MODE,
    secret: process.env.CRON_SECRET,
    authorization: req.headers.get("authorization"),
    // shadow일 때만 실행 시점에 만든다(지연 생성)
    getDeps: () => {
      const admin = createAdminClient();
      return {
        loadExemptIds: () => loadRetentionExemptIdsStrict(admin),
        listVerifyPending: (limit) =>
          admin.from("aif_asset_deletions").select("asset_id, user_id, bucket, path, state, fencing_token, attempts")
            .in("state", ["deleting", "delete_unknown"]).order("updated_at", { ascending: true }).limit(limit),
        // parked_at is null: missing이 된 자산의 비활성 예약은 DB 조건에서 뺀다. 조회한 뒤 거르면 limit을 이미 차지한 뒤라 뒤 항목이 밀린다.
        listDeletePending: (limit) =>
          admin.from("aif_asset_deletions").select("asset_id, user_id, bucket, path, state, fencing_token, attempts")
            .in("state", ["cancelled", "delete_failed", "claimed"]).is("parked_at", null).order("updated_at", { ascending: true }).limit(limit),
        // 보관 연장 표시가 없는 회원의 ready 자산만(프로필 한 곳). 실행자가 보호 회원 목록으로 한 번 더 거른다.
        listReady: (limit) =>
          admin.from("aif_assets").select("id, user_id, state, bucket, path, profiles!inner(retention_exempt)")
            .eq("state", "ready").eq("profiles.retention_exempt", false).order("created_at", { ascending: true }).limit(limit),
        // 객체 없는 ready 후보 훑기(모든 회원). 후속 migration 20261118130000의 함수 — 적용돼 있지 않으면 오류 응답이 오고 실행자는 그 묶음만 건너뛴다.
        scanMissing: (scanLimit, limit) => admin.rpc("aif_asset_missing_scan", { p_scan_limit: scanLimit, p_limit: limit }),
        rpc: (fn, args) => admin.rpc(fn, args),
        remove: (paths) => admin.storage.from(ASSET_BUCKET).remove(paths),
      };
    },
  });
  return NextResponse.json(r.body, { status: r.status, headers: r.headers });
}
