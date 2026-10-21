import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { createAdminClient } from "@/lib/supabase/admin";
import { saveSunoTrackResult, markTrackFailed } from "@/lib/trackSync";
import { saveSunoRemixResult, markRemixFailed } from "@/lib/remixSync";
import type { SunoCallbackPayload } from "@/lib/ai/suno";
import { claimSyncLock, releaseSyncLock } from "@/lib/syncLock";

export const dynamic = "force-dynamic";
// 응답은 바로 보내고 저장(커버 생성·파일 복사)은 waitUntil로 뒤에서 한다 — 그 뒤처리에 쓸 시간.
export const maxDuration = 300;

/**
 * n8n(Make.com) 시나리오 02 대응: Suno가 곡 생성을 마치면 이 URL로 콜백을 보낸다.
 *
 * 이 라우트는 AIMaster 최초의 "진짜 외부 웹훅 수신 라우트"다 — 로그인 세션이 없으므로
 * checkProgramAccessApi()를 쓸 수 없고, task_id가 우리 DB의 실제 music_tracks 레코드와
 * 매칭되는지만으로 신뢰성을 확보한다(Make.com 원본도 별도 서명 검증이 없다). admin(service
 * role) 클라이언트로 RLS를 우회해서 taskId 매칭 → record.user_id 기준으로만 갱신한다.
 *
 * Suno 콜백은 callbackType이 "text" → "first" → "complete" 순으로 여러 번 오므로,
 * "complete"(양쪽 트랙 모두 준비 완료)일 때만 최종 저장 처리하고 나머지는 무시한다.
 *
 * 리믹스(/generate/upload-cover, lib/ai/suno.ts의 requestSunoRemix())도 이 라우트로 들어온다 —
 * docs.sunoapi.org로 콜백 페이로드가 /generate와 동일한 구조임을 확인했다(2026-08-17). task_id를
 * music_tracks에서 못 찾으면 music_track_remixes에서도 찾아본다.
 *
 * 이 웹훅은 로컬 개발 환경(localhost)이나 네트워크 문제로 도달하지 못할 수 있다 — 그 경우를
 * 대비해 lib/actions/tracks.ts의 syncTrackStatusAction()으로 사용자가 직접 "상태 확인"
 * 버튼을 눌러 record-info 폴링으로 같은 저장 로직(lib/trackSync.ts)을 수동 실행할 수 있다.
 *
 * 2026-10-21(docs/SUNOAPI_REFERENCE.md §3): sunoapi.org는 15초 안에 200을 못 받으면 같은 콜백을 다시
 * 보내고, 정상일 때도 중복으로 올 수 있다. 저장(앨범 커버 생성·파일 복사)이 15초를 넘길 수 있어
 * ① 행 잠금(lib/syncLock.ts)을 먼저 차지한 요청만 처리하고 ② 200을 바로 돌려준 뒤 waitUntil로 저장한다.
 * 겹쳐 처리되면 곡이 두 번 저장되고 회원 키로 커버 생성이 두 번 과금될 수 있었다.
 */
export async function POST(request: NextRequest) {
  let payload: SunoCallbackPayload;
  try {
    payload = (await request.json()) as SunoCallbackPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const taskId = payload.data?.task_id;
  if (!taskId) {
    return NextResponse.json({ ok: true, ignored: "no task_id" });
  }

  const callbackType = payload.data?.callbackType;
  if (callbackType && callbackType !== "complete" && payload.code === 200) {
    // 중간 콜백(text/first)은 아직 오디오가 다 준비되지 않았으므로 무시한다.
    return NextResponse.json({ ok: true, ignored: `callbackType=${callbackType}` });
  }

  const admin = createAdminClient();

  const { data: track } = await admin
    .from("music_tracks")
    .select("id, user_id, planning_id, status, title, prompt_text, style_description")
    .eq("task_id", taskId)
    .maybeSingle();

  if (track) {
    if (track.status !== "generating") {
      // 이미 처리된 콜백(중복 전송) — 무시한다.
      return NextResponse.json({ ok: true, ignored: "already processed" });
    }

    if (payload.code !== 200) {
      await markTrackFailed(admin, track, payload.msg ?? "알 수 없는 오류");
      return NextResponse.json({ ok: true });
    }

    if (!(await claimSyncLock(admin, "music_tracks", track.id))) {
      return NextResponse.json({ ok: true, ignored: "already processing" });
    }
    const items = payload.data?.data ?? [];
    waitUntil(
      (async () => {
        try {
          const { savedCount } = await saveSunoTrackResult(admin, track, items);
          if (savedCount === 0) {
            await markTrackFailed(admin, track, "Suno가 오디오 URL을 반환하지 않았습니다.");
          }
        } catch (err) {
          console.error("Suno 곡 저장 실패:", err);
          await releaseSyncLock(admin, "music_tracks", track.id);
        }
      })(),
    );
    return NextResponse.json({ ok: true });
  }

  const { data: remix } = await admin
    .from("music_track_remixes")
    .select(
      "id, user_id, status, source_title, style_description, vocal_gender, suno_model, instrumental, target_duration_seconds, extend_hop_count, lang",
    )
    .eq("task_id", taskId)
    .maybeSingle();

  if (!remix) {
    // 우리 DB에 없는 taskId(다른 환경 콜백 등) — 크래시 없이 안전하게 무시한다.
    return NextResponse.json({ ok: true, ignored: "unknown task_id" });
  }
  if (remix.status !== "generating") {
    return NextResponse.json({ ok: true, ignored: "already processed" });
  }

  if (payload.code !== 200) {
    await markRemixFailed(admin, remix, payload.msg ?? "알 수 없는 오류");
    return NextResponse.json({ ok: true });
  }

  if (!(await claimSyncLock(admin, "music_track_remixes", remix.id))) {
    return NextResponse.json({ ok: true, ignored: "already processing" });
  }
  const items = payload.data?.data ?? [];
  waitUntil(
    (async () => {
      try {
        const { savedCount } = await saveSunoRemixResult(admin, remix, items);
        if (savedCount === 0) {
          await markRemixFailed(admin, remix, "Suno가 오디오 URL을 반환하지 않았습니다.");
        }
      } catch (err) {
        console.error("Suno 리믹스 저장 실패:", err);
        await releaseSyncLock(admin, "music_track_remixes", remix.id);
      }
    })(),
  );

  return NextResponse.json({ ok: true });
}
