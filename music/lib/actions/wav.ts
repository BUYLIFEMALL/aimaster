"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess, logProgramUsage } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/apiKeys";
import { requestSunoWavConversion, checkSunoWavConversionStatus } from "@/lib/ai/suno";
import { persistSunoAssetToStorage } from "@/lib/trackSync";
import type { WavStatus } from "@/types/database.types";

export interface CreateWavState {
  error?: string;
  needsApiKey?: string; // "suno"
}

/**
 * "WAV 변환" — 완성된 특정 variant(오디오)를 고음질 WAV로 변환한다. MR과 마찬가지로
 * 결과는 music_track_wav에 별도로 쌓인다. 이 API는 taskId(원곡 생성 당시 값)와
 * audioId(variant의 Suno 오디오 id) 둘 다 필요하다.
 */
export async function createWavAction(variantId: string): Promise<CreateWavState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: variant, error: variantError } = await supabase
    .from("music_track_variants")
    .select("id, track_id, suno_audio_id")
    .eq("id", variantId)
    .eq("user_id", user.id)
    .single();
  if (variantError || !variant) {
    return { error: "곡을 찾을 수 없습니다." };
  }
  if (!variant.suno_audio_id) {
    return { error: "이 곡은 Suno 오디오 ID가 없어서 WAV로 변환할 수 없습니다." };
  }

  const { data: track } = await supabase
    .from("music_tracks")
    .select("planning_id, task_id")
    .eq("id", variant.track_id)
    .eq("user_id", user.id)
    .single();
  if (!track?.task_id) {
    return { error: "원곡 생성 정보를 찾을 수 없어서 WAV로 변환할 수 없습니다." };
  }

  const sunoKey = await resolveApiKey(supabase, user.id, "suno");
  if (!sunoKey) return { needsApiKey: "suno" };

  try {
    const { data: wav, error: insertError } = await supabase
      .from("music_track_wav")
      .insert({ variant_id: variant.id, user_id: user.id, status: "generating" })
      .select("id")
      .single();
    if (insertError || !wav) {
      return { error: insertError?.message ?? "WAV 변환 요청 저장에 실패했습니다." };
    }

    const taskId = await requestSunoWavConversion(
      { sourceTaskId: track.task_id, audioId: variant.suno_audio_id },
      sunoKey,
    );
    await supabase.from("music_track_wav").update({ task_id: taskId }).eq("id", wav.id);

    await logProgramUsage({ userId: user.id, action: "create_wav", metadata: { variantId } });
    revalidatePath(`/plannings/${track.planning_id}`);
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "WAV 변환 요청 중 오류가 발생했습니다." };
  }
}

export interface SyncWavStatusState {
  error?: string;
  status?: WavStatus;
}

/** 웹훅이 도달하지 못했을 때(로컬 개발 환경 등) 대비한 수동 동기화 — WAV는 상태 조회가 된다. */
export async function syncWavStatusAction(wavId: string): Promise<SyncWavStatusState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: wav, error: wavError } = await supabase
    .from("music_track_wav")
    .select("id, user_id, variant_id, task_id, status")
    .eq("id", wavId)
    .eq("user_id", user.id)
    .single();
  if (wavError || !wav) {
    return { error: "WAV 변환 요청을 찾을 수 없습니다." };
  }
  if (wav.status !== "generating") {
    return { status: wav.status };
  }
  if (!wav.task_id) {
    return { error: "아직 Suno에 변환 요청이 전달되지 않았습니다." };
  }

  const sunoKey = await resolveApiKey(supabase, user.id, "suno");
  if (!sunoKey) {
    return { error: "Suno API 키가 없습니다. 설정 페이지에서 본인 키를 등록해주세요." };
  }

  const { data: variant } = await supabase
    .from("music_track_variants")
    .select("track_id")
    .eq("id", wav.variant_id)
    .single();
  const { data: track } = variant
    ? await supabase.from("music_tracks").select("planning_id").eq("id", variant.track_id).single()
    : { data: null };

  try {
    const result = await checkSunoWavConversionStatus(wav.task_id, sunoKey);

    if (result.state === "processing") {
      return { status: "generating" };
    }
    if (result.state === "failed") {
      await supabase.from("music_track_wav").update({ status: "failed", error_message: result.error }).eq("id", wav.id);
      if (track) revalidatePath(`/plannings/${track.planning_id}`);
      return { status: "failed" };
    }

    const wavUrl = await persistSunoAssetToStorage(
      supabase,
      `${wav.user_id}/${wav.variant_id}/converted.wav`,
      result.wavUrl,
      "audio/wav",
    );
    await supabase.from("music_track_wav").update({ status: "completed", wav_url: wavUrl }).eq("id", wav.id);
    if (track) revalidatePath(`/plannings/${track.planning_id}`);
    return { status: "completed" };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "상태 확인 중 오류가 발생했습니다." };
  }
}
