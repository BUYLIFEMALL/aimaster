import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { persistSunoAssetToStorage } from "@/lib/trackSync";
import { checkSunoWavConversionStatus, type SunoWavCallbackPayload } from "@/lib/ai/suno";
import { getUserApiKey } from "@/lib/apiKeys";
import { waitForSettled } from "@/lib/sunoVerify";

export const dynamic = "force-dynamic";

/**
 * "WAV 변환" 전용 웹훅 — Suno `/wav/generate`가 완료되면 이 URL로 콜백을 보낸다.
 * /api/webhooks/suno-vocal-removal과 마찬가지로 페이로드 구조가 달라서(callbackType/data
 * 배열 없이 audioWavUrl 하나만 옴) 별도 라우트로 분리했다. task_id 매칭 + admin 클라이언트
 * 원칙은 기존 웹훅들과 동일. WAV는 mp3보다 훨씬 큰 파일이라도 Suno 쪽 URL이 영구적이라는
 * 보장이 없어서(다른 asset들과 동일하게) 콜백을 받는 즉시 우리 Storage로 다운로드해 저장한다.
 * 2026-10-22(D-68-01): 콜백 본문의 WAV 주소·성공 여부는 쓰지 않고, 회원 본인 Suno 키로 /wav/record-info를 다시 조회한 결과로 저장한다.
 */
export async function POST(request: NextRequest) {
  let payload: SunoWavCallbackPayload;
  try {
    payload = (await request.json()) as SunoWavCallbackPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }
  // 문서에 나온 페이로드 모양과 실제 응답이 달랐던 이력이 있어서(위 파일 상단 주석 참고),
  // 다음에 또 어긋나면 바로 원인 파악할 수 있도록 원본 페이로드를 로그에 남긴다.
  console.log("[suno-wav webhook] payload:", JSON.stringify(payload));

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

  const sunoKey = await getUserApiKey(admin, wav.user_id, "suno");
  if (!sunoKey) return NextResponse.json({ ok: true, ignored: "no member key" });
  const result = await waitForSettled(
    () => checkSunoWavConversionStatus(taskId, sunoKey),
    (r) => r.state === "processing",
    2,
    3000,
  );
  if (result.state === "processing") {
    return NextResponse.json({ ok: true, ignored: "still processing" });
  }
  if (result.state === "failed") {
    await admin.from("music_track_wav").update({ status: "failed", error_message: result.error }).eq("id", wav.id);
    return NextResponse.json({ ok: true });
  }
  const sourceWavUrl = result.wavUrl;

  const wavUrl = await persistSunoAssetToStorage(
    admin,
    `${wav.user_id}/${wav.variant_id}/converted.wav`,
    sourceWavUrl,
    "audio/wav",
  );

  await admin.from("music_track_wav").update({ status: "completed", wav_url: wavUrl }).eq("id", wav.id);

  return NextResponse.json({ ok: true });
}
