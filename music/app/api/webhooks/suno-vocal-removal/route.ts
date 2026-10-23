import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { createAdminClient } from "@/lib/supabase/admin";
import { persistSunoAssetToStorage } from "@/lib/trackSync";
import { SUNO_STEMS, checkSunoVocalRemovalStatus, type SunoVocalRemovalCallbackPayload } from "@/lib/ai/suno";
import { getUserApiKey } from "@/lib/apiKeys";
import { waitForSettled } from "@/lib/sunoVerify";
import { claimSyncLock, releaseSyncLock } from "@/lib/syncLock";

export const dynamic = "force-dynamic";
// 12트랙 파일 복사는 15초(sunoapi.org 콜백 응답 한도)를 넘길 수 있어 응답 뒤 waitUntil로 저장한다.
export const maxDuration = 300;

/**
 * "MR(보컬제거) 만들기" 전용 웹훅 — Suno `/vocal-removal/generate`가 완료되면 이 URL로
 * 콜백을 보낸다. /api/webhooks/suno(곡 생성/연장용)와 페이로드 구조가 완전히 달라서
 * (callbackType, data 배열이 없고 vocal_removal_info 하나만 옴) 별도 라우트로 분리했다.
 * 세션이 없는 진짜 외부 웹훅이라 task_id 매칭 + admin(service role) 클라이언트로만 신뢰성을
 * 확보하는 건 기존 웹훅과 동일한 설계 원칙을 따른다.
 *
 * Suno 문서상 이 결과 URL은 14일만 유효하다고 명시돼 있어서, 콜백을 받는 즉시 우리
 * Storage(music-audio)로 다운로드해 영구 저장한다.
 *
 * 2026-10-21 V6 1차 ②: type=split_stem(악기별 최대 12트랙)도 이 라우트로 온다 — instrumental_url 없이
 * vocal_url·drums_url… 이 오므로 행의 type으로 나눠 처리하고, 결과는 stems(jsonb)에 저장한다.
 * 곡 웹훅과 같이 잠금(lib/syncLock.ts) → 즉시 200 → waitUntil 저장(중복 콜백·15초 한도 대응).
 *
 * 2026-10-22(D-68-01 콜백 신뢰 확인): 콜백 본문의 성공·실패·파일 주소는 쓰지 않고, 회원 본인 Suno 키로
 * /vocal-removal/record-info를 다시 조회한 결과로만 저장·실패 처리한다(lib/sunoVerify.ts).
 */
export async function POST(request: NextRequest) {
  let payload: SunoVocalRemovalCallbackPayload;
  try {
    payload = (await request.json()) as SunoVocalRemovalCallbackPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const taskId = payload.data?.task_id;
  if (!taskId) {
    return NextResponse.json({ ok: true, ignored: "no task_id" });
  }

  const admin = createAdminClient();

  const { data: mr } = await admin
    .from("music_track_mr")
    .select("id, user_id, variant_id, status, type")
    .eq("task_id", taskId)
    .maybeSingle();

  if (!mr) {
    return NextResponse.json({ ok: true, ignored: "unknown task_id" });
  }
  if (mr.status !== "generating") {
    return NextResponse.json({ ok: true, ignored: "already processed" });
  }

  const isStems = (mr as { type?: string }).type === "split_stem";

  if (!(await claimSyncLock(admin, "music_track_mr", mr.id))) {
    return NextResponse.json({ ok: true, ignored: "already processing" });
  }

  waitUntil(
    (async () => {
      try {
        const sunoKey = await getUserApiKey(admin, mr.user_id, "suno");
        const result = sunoKey
          ? await waitForSettled(
              () => checkSunoVocalRemovalStatus(taskId, sunoKey),
              (r) => r.state === "processing",
            )
          : null;
        if (!result || result.state === "processing") {
          await releaseSyncLock(admin, "music_track_mr", mr.id);
          return;
        }
        if (result.state === "failed") {
          await admin.from("music_track_mr").update({ status: "failed", error_message: result.error }).eq("id", mr.id);
          return;
        }
        const info = result.info;
        if (!isStems && !info.instrumental_url) {
          await admin
            .from("music_track_mr")
            .update({ status: "failed", error_message: "Suno가 반주(MR) URL을 반환하지 않았습니다." })
            .eq("id", mr.id);
          return;
        }

        if (isStems) {
          const stems: Record<string, string> = {};
          for (const { key } of SUNO_STEMS) {
            const src = info[`${key}_url`];
            if (!src) continue;
            stems[key] = await persistSunoAssetToStorage(admin, `${mr.user_id}/${mr.variant_id}/stem-${key}.mp3`, src, "audio/mpeg");
          }
          await admin
            .from("music_track_mr")
            .update(
              Object.keys(stems).length
                ? { status: "completed", stems, error_message: null }
                : { status: "failed", error_message: "Suno가 악기별 트랙 주소를 반환하지 않았습니다." },
            )
            .eq("id", mr.id);
          return;
        }

        const instrumentalUrl = await persistSunoAssetToStorage(
          admin,
          `${mr.user_id}/${mr.variant_id}/mr-instrumental.mp3`,
          info.instrumental_url!,
          "audio/mpeg",
        );
        const vocalUrl = info.vocal_url
          ? await persistSunoAssetToStorage(admin, `${mr.user_id}/${mr.variant_id}/mr-vocal.mp3`, info.vocal_url, "audio/mpeg")
          : null;

        await admin
          .from("music_track_mr")
          .update({ status: "completed", instrumental_url: instrumentalUrl, vocal_url: vocalUrl, error_message: null })
          .eq("id", mr.id);
      } catch (err) {
        console.error("Suno 분리 결과 저장 실패:", err);
        await releaseSyncLock(admin, "music_track_mr", mr.id);
      }
    })(),
  );

  return NextResponse.json({ ok: true });
}
