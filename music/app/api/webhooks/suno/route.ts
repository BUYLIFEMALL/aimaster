import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SunoCallbackItem, SunoCallbackPayload } from "@/lib/ai/suno";

export const dynamic = "force-dynamic";

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
    .select("id, user_id, planning_id, status")
    .eq("task_id", taskId)
    .maybeSingle();

  if (!track) {
    // 우리 DB에 없는 taskId(다른 환경 콜백 등) — 크래시 없이 안전하게 무시한다.
    return NextResponse.json({ ok: true, ignored: "unknown task_id" });
  }
  if (track.status !== "generating") {
    // 이미 처리된 콜백(중복 전송) — 무시한다.
    return NextResponse.json({ ok: true, ignored: "already processed" });
  }

  if (payload.code !== 200) {
    await admin
      .from("music_tracks")
      .update({ status: "failed", error_message: payload.msg ?? "알 수 없는 오류" })
      .eq("id", track.id);
    await syncPlanningStatus(admin, track.planning_id);
    return NextResponse.json({ ok: true });
  }

  const items = payload.data?.data ?? [];
  const variants = await Promise.all(
    items.map((item, index) => persistVariant(admin, track.user_id, track.id, item, index)),
  );
  const validVariants = variants.filter((v): v is NonNullable<typeof v> => v !== null);

  if (validVariants.length === 0) {
    await admin
      .from("music_tracks")
      .update({ status: "failed", error_message: "Suno가 오디오 URL을 반환하지 않았습니다." })
      .eq("id", track.id);
    await syncPlanningStatus(admin, track.planning_id);
    return NextResponse.json({ ok: true });
  }

  await admin.from("music_track_variants").insert(validVariants);
  await admin.from("music_tracks").update({ status: "completed" }).eq("id", track.id);
  await syncPlanningStatus(admin, track.planning_id);

  return NextResponse.json({ ok: true });
}

type AdminClient = ReturnType<typeof createAdminClient>;

/** Suno의 임시 오디오/이미지 URL을 우리 Storage(music-audio)에 영구 저장한다. 실패하면 null. */
async function persistVariant(
  admin: AdminClient,
  userId: string,
  trackId: string,
  item: SunoCallbackItem,
  index: number,
) {
  const sourceAudioUrl = item.audio_url || item.stream_audio_url;
  if (!sourceAudioUrl) return null;

  const audioUrl = await persistToStorage(admin, `${userId}/${trackId}/${index}.mp3`, sourceAudioUrl, "audio/mpeg");
  const imageUrl = item.image_url
    ? await persistToStorage(admin, `${userId}/${trackId}/${index}.jpg`, item.image_url, "image/jpeg")
    : null;

  return {
    track_id: trackId,
    user_id: userId,
    suno_audio_id: item.id ?? null,
    audio_url: audioUrl,
    image_url: imageUrl,
    duration_seconds: item.duration != null ? Math.round(item.duration) : null,
  };
}

/** shots/persistBgmAudio()와 동일한 패턴: 다운로드 실패 시 원본 URL을 그대로 폴백으로 쓴다. */
async function persistToStorage(
  admin: AdminClient,
  path: string,
  sourceUrl: string,
  contentType: string,
): Promise<string> {
  try {
    const response = await fetch(sourceUrl);
    if (!response.ok) return sourceUrl;
    const buffer = Buffer.from(await response.arrayBuffer());

    const { error } = await admin.storage.from("music-audio").upload(path, buffer, { contentType, upsert: true });
    if (error) return sourceUrl;

    const { data } = admin.storage.from("music-audio").getPublicUrl(path);
    return data.publicUrl;
  } catch {
    return sourceUrl;
  }
}

/** 기획에 속한 모든 트랙이 종결 상태(completed/failed)가 되면 기획 상태도 함께 정리한다. */
async function syncPlanningStatus(admin: AdminClient, planningId: string) {
  const { data: tracks } = await admin.from("music_tracks").select("status").eq("planning_id", planningId);
  if (!tracks || tracks.length === 0) return;

  const stillGenerating = tracks.some((t) => t.status === "generating");
  if (stillGenerating) return;

  const allFailed = tracks.every((t) => t.status === "failed");
  await admin
    .from("music_plannings")
    .update({ status: allFailed ? "error" : "completed" })
    .eq("id", planningId);
}
