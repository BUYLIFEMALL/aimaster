"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess, logProgramUsage } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveApiKey } from "@/lib/apiKeys";
import { checkSunoMediaStatus, requestSunoCover, requestSunoVideo } from "@/lib/ai/suno";
import { markMediaFailed, saveMediaResult } from "@/lib/mediaSync";

export interface MediaState {
  error?: string;
  needsApiKey?: string; // "suno"
  pending?: boolean;
}

/** 「🖼️ Suno 커버 받기」 — 곡 작업당 1번(Suno 규칙). 이미 받은 결과가 있으면 다시 부르지 않는다. */
export async function requestSunoCoverAction(trackId: string): Promise<MediaState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const { data: track } = await supabase
    .from("music_tracks")
    .select("id, planning_id, task_id, status")
    .eq("id", trackId)
    .eq("user_id", user.id)
    .single();
  if (!track?.task_id || track.status !== "completed") return { error: "완성된 곡에서만 Suno 커버를 받을 수 있습니다." };

  const { data: existing } = await supabase
    .from("music_track_media")
    .select("id, status")
    .eq("track_id", track.id)
    .eq("kind", "suno_cover")
    .neq("status", "failed")
    .limit(1)
    .maybeSingle();
  if (existing) return { error: "이 곡은 이미 Suno 커버를 요청했습니다(곡당 한 번). 아래 결과를 확인해 주세요." };

  const sunoKey = await resolveApiKey(supabase, user.id, "suno");
  if (!sunoKey) return { needsApiKey: "suno" };

  const { data: row, error } = await supabase
    .from("music_track_media")
    .insert({ user_id: user.id, track_id: track.id, kind: "suno_cover", status: "generating" })
    .select("id")
    .single();
  if (error || !row) return { error: error?.message ?? "요청 저장에 실패했습니다." };
  try {
    const taskId = await requestSunoCover(track.task_id, sunoKey);
    await supabase.from("music_track_media").update({ task_id: taskId }).eq("id", row.id);
    await logProgramUsage({ userId: user.id, action: "suno_cover", metadata: { trackId } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Suno 커버 요청 중 오류가 발생했습니다.";
    await markMediaFailed(supabase, row.id, message);
    revalidatePath(`/plannings/${track.planning_id}`);
    return { error: message };
  }
  revalidatePath(`/plannings/${track.planning_id}`);
  return {};
}

/** 「🎬 Suno 뮤직비디오」 — 변주(곡 1개)마다. author는 영상에 표시되는 이름(선택, 50자). */
export async function requestSunoVideoAction(variantId: string, author?: string): Promise<MediaState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const { data: variant } = await supabase
    .from("music_track_variants")
    .select("id, track_id, suno_audio_id")
    .eq("id", variantId)
    .eq("user_id", user.id)
    .single();
  if (!variant?.suno_audio_id) return { error: "이 곡은 Suno 오디오 ID가 없어서 영상을 만들 수 없습니다." };
  const { data: track } = await supabase
    .from("music_tracks")
    .select("id, planning_id, task_id")
    .eq("id", variant.track_id)
    .eq("user_id", user.id)
    .single();
  if (!track?.task_id) return { error: "원곡의 Suno 작업 ID가 없어서 영상을 만들 수 없습니다." };

  const sunoKey = await resolveApiKey(supabase, user.id, "suno");
  if (!sunoKey) return { needsApiKey: "suno" };

  const { data: row, error } = await supabase
    .from("music_track_media")
    .insert({ user_id: user.id, track_id: track.id, variant_id: variant.id, kind: "video", status: "generating" })
    .select("id")
    .single();
  if (error || !row) return { error: error?.message ?? "요청 저장에 실패했습니다." };
  try {
    const taskId = await requestSunoVideo({ sourceTaskId: track.task_id, audioId: variant.suno_audio_id, author }, sunoKey);
    await supabase.from("music_track_media").update({ task_id: taskId }).eq("id", row.id);
    await logProgramUsage({ userId: user.id, action: "suno_video", metadata: { variantId } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Suno 뮤직비디오 요청 중 오류가 발생했습니다.";
    await markMediaFailed(supabase, row.id, message);
    revalidatePath(`/plannings/${track.planning_id}`);
    return { error: message };
  }
  revalidatePath(`/plannings/${track.planning_id}`);
  return {};
}

/** 결과가 자동으로 오지 않았을 때 「상태 확인」 — Suno 상태 조회 후 완료면 저장한다. */
export async function syncMediaAction(mediaId: string): Promise<MediaState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("music_track_media")
    .select("id, user_id, track_id, variant_id, kind, task_id, status")
    .eq("id", mediaId)
    .eq("user_id", user.id)
    .single();
  if (!row?.task_id || row.status !== "generating") return {};
  const sunoKey = await resolveApiKey(supabase, user.id, "suno");
  if (!sunoKey) return { needsApiKey: "suno" };
  const result = await checkSunoMediaStatus(row.kind, row.task_id, sunoKey);
  if (result.status === "pending") return { pending: true };
  if (result.status === "failed") await markMediaFailed(supabase, row.id, result.message);
  else await saveMediaResult(supabase, row, result.urls);
  const { data: track } = await supabase.from("music_tracks").select("planning_id").eq("id", row.track_id).single();
  if (track) revalidatePath(`/plannings/${track.planning_id}`);
  return {};
}

/** 「이 커버로 바꾸기」 — 그 곡의 모든 변주 커버를 고른 Suno 커버로 교체한다. */
export async function applySunoCoverAction(mediaId: string, index: number): Promise<MediaState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("music_track_media")
    .select("track_id, kind, status, urls")
    .eq("id", mediaId)
    .eq("user_id", user.id)
    .single();
  const url = row?.kind === "suno_cover" && row.status === "completed" ? (row.urls as string[])[index] : undefined;
  if (!row || !url) return { error: "고른 커버를 찾을 수 없습니다." };
  // music_track_variants에는 회원 수정(RLS update) 정책이 없어 회원 세션으로 고치면 오류 없이 0건이 된다(2026-10-21 실검수).
  // 위에서 본인 행임을 확인했으므로 관리자 클라이언트로 그 회원·그 곡 변주만 고친다(user_id 조건 필수).
  const { data: updated, error } = await createAdminClient()
    .from("music_track_variants")
    .update({ image_url: url })
    .eq("track_id", row.track_id)
    .eq("user_id", user.id)
    .select("id");
  if (error) return { error: error.message };
  if (!updated?.length) return { error: "커버를 바꿀 곡을 찾지 못했습니다. 화면을 새로고침해 주세요." };
  const { data: track } = await supabase.from("music_tracks").select("planning_id").eq("id", row.track_id).single();
  if (track) revalidatePath(`/plannings/${track.planning_id}`);
  return {};
}
