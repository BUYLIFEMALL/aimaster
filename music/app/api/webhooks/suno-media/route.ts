import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { createAdminClient } from "@/lib/supabase/admin";
import { claimSyncLock, releaseSyncLock } from "@/lib/syncLock";
import { markMediaFailed, saveMediaResult } from "@/lib/mediaSync";

export const dynamic = "force-dynamic";
// 영상 파일 복사는 sunoapi.org 콜백 응답 한도(15초)를 넘길 수 있어 응답 뒤 waitUntil로 저장한다.
export const maxDuration = 300;

/**
 * Suno 커버 이미지(/suno/cover/generate)·뮤직비디오(/mp4/generate) 공용 웹훅(2026-10-21 Suno V6 3차 ⑦⑧).
 * 커버: { code, data: { taskId, images[] } } / 영상: { code, data: { task_id, video_url } }.
 * 세션 없는 외부 콜백이라 다른 웹훅과 같이 작업 번호 매칭 + 관리자 클라이언트로만 처리하고, 잠금으로 중복 콜백을 막는다.
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

  const urls = row.kind === "suno_cover" ? (payload.data?.images ?? []) : [payload.data?.video_url].filter((u): u is string => !!u);
  if (payload.code !== 200 || urls.length === 0) {
    await markMediaFailed(admin, row.id, payload.msg ?? "Suno가 결과를 보내지 않았습니다.");
    return NextResponse.json({ ok: true });
  }

  if (!(await claimSyncLock(admin, "music_track_media", row.id))) {
    return NextResponse.json({ ok: true, ignored: "already processing" });
  }
  waitUntil(
    saveMediaResult(admin, row, urls).catch(async (err) => {
      console.error("Suno 커버·영상 저장 실패:", err);
      await releaseSyncLock(admin, "music_track_media", row.id);
    }),
  );
  return NextResponse.json({ ok: true });
}
