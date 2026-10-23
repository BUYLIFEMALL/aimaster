import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { createAdminClient } from "@/lib/supabase/admin";
import { claimSyncLock, releaseSyncLock } from "@/lib/syncLock";
import { markMediaFailed, saveMediaResult } from "@/lib/mediaSync";
import { checkSunoMediaStatus, type SunoMediaKind } from "@/lib/ai/suno";
import { getUserApiKey } from "@/lib/apiKeys";
import { waitForSettled } from "@/lib/sunoVerify";

export const dynamic = "force-dynamic";
// 영상 파일 복사는 sunoapi.org 콜백 응답 한도(15초)를 넘길 수 있어 응답 뒤 waitUntil로 저장한다.
export const maxDuration = 300;

/**
 * Suno 커버 이미지(/suno/cover/generate)·뮤직비디오(/mp4/generate) 공용 웹훅(2026-10-21 Suno V6 3차 ⑦⑧).
 * 커버: { code, data: { taskId, images[] } } / 영상: { code, data: { task_id, video_url } }.
 * 세션 없는 외부 콜백이라 다른 웹훅과 같이 작업 번호 매칭 + 관리자 클라이언트로만 처리하고, 잠금으로 중복 콜백을 막는다.
 * 2026-10-22(D-68-01): 콜백 본문의 결과 주소·성공 여부는 쓰지 않고, 회원 본인 Suno 키로 record-info를 다시 조회해 저장한다.
 */
export async function POST(request: NextRequest) {
  let payload: { code?: number; msg?: string; data?: { taskId?: string; task_id?: string; images?: string[] | null; video_url?: string | null } };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }
  const taskId = payload.data?.taskId ?? payload.data?.task_id;
  if (!taskId) return NextResponse.json({ ok: true, ignored: "no task_id" });

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("music_track_media")
    .select("id, user_id, track_id, variant_id, kind, status")
    .eq("task_id", taskId)
    .eq("status", "generating")
    .limit(1)
    .maybeSingle();
  if (!row) return NextResponse.json({ ok: true, ignored: "unknown or processed task_id" });

  if (!(await claimSyncLock(admin, "music_track_media", row.id))) {
    return NextResponse.json({ ok: true, ignored: "already processing" });
  }
  waitUntil(
    (async () => {
      try {
        const sunoKey = await getUserApiKey(admin, row.user_id, "suno");
        const result = sunoKey
          ? await waitForSettled(
              () => checkSunoMediaStatus(row.kind as SunoMediaKind, taskId, sunoKey),
              (r) => r.status === "pending",
            )
          : null;
        if (!result || result.status === "pending") {
          await releaseSyncLock(admin, "music_track_media", row.id);
        } else if (result.status === "failed") {
          await markMediaFailed(admin, row.id, result.message);
        } else {
          await saveMediaResult(admin, row, result.urls);
        }
      } catch (err) {
        console.error("Suno 커버·영상 저장 실패:", err);
        await releaseSyncLock(admin, "music_track_media", row.id);
      }
    })(),
  );
  return NextResponse.json({ ok: true });
}
