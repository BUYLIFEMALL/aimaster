import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { persistSunoAssetToStorage } from "@/lib/trackSync";
import type { SunoWavCallbackPayload } from "@/lib/ai/suno";

export const dynamic = "force-dynamic";

/**
 * "WAV 변환" 전용 웹훅 — Suno `/wav/generate`가 완료되면 이 URL로 콜백을 보낸다.
 * /api/webhooks/suno-vocal-removal과 마찬가지로 페이로드 구조가 달라서(callbackType/data
 * 배열 없이 audioWavUrl 하나만 옴) 별도 라우트로 분리했다. task_id 매칭 + admin 클라이언트
 * 원칙은 기존 웹훅들과 동일. WAV는 mp3보다 훨씬 큰 파일이라도 Suno 쪽 URL이 영구적이라는
 * 보장이 없어서(다른 asset들과 동일하게) 콜백을 받는 즉시 우리 Storage로 다운로드해 저장한다.
 */
export async function POST(request: NextRequest) {
  let payload: SunoWavCallbackPayload;
  try {
    payload = (await request.json()) as SunoWavCallbackPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const taskId = payload.data?.task_id;
  if (!taskId) {
    return NextResponse.json({ ok: true, ignored: "no task_id" });
  }

  const admin = createAdminClient();

  const { data: wav } = await admin
    .from("music_track_wav")
    .select("id, user_id, variant_id, status")
    .eq("task_id", taskId)
    .maybeSingle();

  if (!wav) {
    return NextResponse.json({ ok: true, ignored: "unknown task_id" });
  }
  if (wav.status !== "generating") {
    return NextResponse.json({ ok: true, ignored: "already processed" });
  }

  if (payload.code !== 200 || !payload.data?.audioWavUrl) {
    await admin
      .from("music_track_wav")
      .update({ status: "failed", error_message: payload.msg ?? "Suno가 WAV URL을 반환하지 않았습니다." })
      .eq("id", wav.id);
    return NextResponse.json({ ok: true });
  }

  const wavUrl = await persistSunoAssetToStorage(
    admin,
    `${wav.user_id}/${wav.variant_id}/converted.wav`,
    payload.data.audioWavUrl,
    "audio/wav",
  );

  await admin.from("music_track_wav").update({ status: "completed", wav_url: wavUrl }).eq("id", wav.id);

  return NextResponse.json({ ok: true });
}
