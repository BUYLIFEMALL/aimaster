"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess, logProgramUsage } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/apiKeys";
import { generateRemixStyle } from "@/lib/ai/musicPrompts";
import { requestSunoRemix, toSunoVocalGender, DEFAULT_SUNO_MODEL, checkSunoGenerationStatus } from "@/lib/ai/suno";
import { saveSunoRemixResult, markRemixFailed } from "@/lib/remixSync";
import type { RemixStatus, VocalGender } from "@/types/database.types";

export interface CreateRemixState {
  error?: string;
  needsApiKey?: string; // "openai" | "suno"
}

const MAX_REMIX_COUNT = 10;
const MAX_SOURCE_FILE_BYTES = 50 * 1024 * 1024; // 50MB — Suno가 받는 원곡 업로드 크기 여유

// docs.sunoapi.org 확인 결과, /generate/upload-cover는 customMode:true + instrumental:false일 때
// prompt가 필수 필드다(비워두면 요청 자체가 거부될 수 있음). 가사를 안 넣은 보컬 리믹스에서도
// 요청이 막히지 않도록, 가사가 없으면 "원곡의 감정/스토리를 유지하며 새 스타일로 불러달라"는
// 일반적인 지시문으로 대체한다.
const DEFAULT_REMIX_PROMPT =
  "Sing this song in the new style described above, keeping the same emotional theme and story as the original.";

// Suno "duration" 파라미터(V5_5+customMode에서만 적용, 10~360초)를 안 넣으면 원곡이 3분짜리여도
// 결과가 33초로 아주 짧게 나오는 문제를 실사용 테스트로 발견했다(2026-08-17, lib/ai/suno.ts 주석
// 참고) — 항상 명시적으로 넘긴다. 기존 곡을 재사용하면 그 곡의 실제 길이를, 새로 업로드한
// 파일이면(길이를 아직 모르므로) 기본 3분을 쓴다.
const MIN_REMIX_DURATION_SECONDS = 10;
const MAX_REMIX_DURATION_SECONDS = 360;
const DEFAULT_REMIX_DURATION_SECONDS = 180;

function clampDuration(seconds: number | null | undefined): number {
  if (!seconds || Number.isNaN(seconds)) return DEFAULT_REMIX_DURATION_SECONDS;
  return Math.min(Math.max(Math.round(seconds), MIN_REMIX_DURATION_SECONDS), MAX_REMIX_DURATION_SECONDS);
}

/**
 * n8n(Make.com) 시나리오 41(리믹스) 대응: 업로드한(또는 이미 생성한 곡에서 재사용한) 원곡
 * 오디오를 "원하는 느낌"에 맞춰 count(1~10)개의 새 스타일로 리믹스한다. count가 2 이상이면
 * generateTracksAction의 대량생성과 동일한 방식으로, 이번 배치에서 이미 나온 스타일과
 * 겹치지 않게 매번 새로 GPT 스타일을 만든다.
 *
 * 원본 소스는 둘 중 하나다:
 * - sourceVariantId가 있으면: 완성곡 카드의 "이 곡으로 리믹스" 버튼으로 넘어온 경우 —
 *   해당 variant의 audio_url을 그대로 원곡으로 쓴다(업로드 불필요).
 * - 없으면: 사용자가 새로 업로드한 오디오 파일을 본인 Storage 경로에 저장하고 그 URL을 쓴다.
 */
export async function createRemixAction(formData: FormData): Promise<CreateRemixState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const desiredFeel = String(formData.get("desiredFeel") ?? "").trim();
  if (!desiredFeel) return { error: "원하는 느낌/분위기를 입력해주세요." };

  const sourceTitle = String(formData.get("sourceTitle") ?? "").trim() || null;
  const lyrics = String(formData.get("lyrics") ?? "").trim() || null;
  const instrumental = formData.get("instrumental") === "on";
  const vocalGenderRaw = String(formData.get("vocalGender") ?? "").trim();
  const vocalGender = (vocalGenderRaw || null) as VocalGender | null;
  const styleWeight = clamp01(formData.get("styleWeight"));
  const weirdnessConstraint = clamp01(formData.get("weirdnessConstraint"));
  const audioWeight = clamp01(formData.get("audioWeight"));
  const clampedCount = Math.min(Math.max(Math.round(Number(formData.get("count")) || 1), 1), MAX_REMIX_COUNT);

  const sourceVariantId = String(formData.get("sourceVariantId") ?? "").trim() || null;
  let sourceAudioUrl: string;
  let resolvedSourceTitle = sourceTitle;
  let durationSeconds = DEFAULT_REMIX_DURATION_SECONDS;

  if (sourceVariantId) {
    const { data: variant } = await supabase
      .from("music_track_variants")
      .select("id, audio_url, track_id, duration_seconds")
      .eq("id", sourceVariantId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!variant) return { error: "리믹스할 원곡을 찾을 수 없습니다." };
    sourceAudioUrl = variant.audio_url;
    durationSeconds = clampDuration(variant.duration_seconds);

    if (!resolvedSourceTitle) {
      const { data: track } = await supabase.from("music_tracks").select("title").eq("id", variant.track_id).maybeSingle();
      resolvedSourceTitle = track?.title ?? null;
    }
  } else {
    const file = formData.get("sourceFile");
    if (!(file instanceof File) || file.size === 0) {
      return { error: "리믹스할 원곡 오디오 파일을 업로드해주세요." };
    }
    if (file.size > MAX_SOURCE_FILE_BYTES) {
      return { error: "파일 용량이 너무 큽니다 (최대 50MB)." };
    }

    const ext = (file.name.split(".").pop() || "mp3").toLowerCase().replace(/[^a-z0-9]/g, "") || "mp3";
    const path = `${user.id}/remix-sources/${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("music-audio")
      .upload(path, buffer, { contentType: file.type || "audio/mpeg", upsert: true });
    if (uploadError) return { error: `원곡 업로드에 실패했습니다: ${uploadError.message}` };

    const { data: publicUrlData } = supabase.storage.from("music-audio").getPublicUrl(path);
    sourceAudioUrl = publicUrlData.publicUrl;
  }

  const openaiKey = await resolveApiKey(supabase, user.id, "openai");
  if (!openaiKey) return { needsApiKey: "openai" };
  const sunoKey = await resolveApiKey(supabase, user.id, "suno");
  if (!sunoKey) return { needsApiKey: "suno" };

  try {
    const usedStyles: string[] = [];

    for (let i = 0; i < clampedCount; i++) {
      const styleResult = await generateRemixStyle(
        {
          desiredFeel,
          sourceDescription: resolvedSourceTitle ?? undefined,
          vocalGender,
          avoidStyles: usedStyles.length > 0 ? usedStyles : undefined,
        },
        openaiKey,
      );
      usedStyles.push(styleResult.styleDescription);

      const { data: remix, error: insertError } = await supabase
        .from("music_track_remixes")
        .insert({
          user_id: user.id,
          source_audio_url: sourceAudioUrl,
          source_title: resolvedSourceTitle,
          desired_feel: desiredFeel,
          lyrics: instrumental ? null : lyrics,
          style_description: styleResult.styleDescription,
          style_weight: styleWeight,
          weirdness_constraint: weirdnessConstraint,
          audio_weight: audioWeight,
          vocal_gender: instrumental ? null : vocalGender,
          suno_model: DEFAULT_SUNO_MODEL,
          status: "generating",
        })
        .select("id")
        .single();
      if (insertError || !remix) {
        return { error: insertError?.message ?? "리믹스 요청 저장에 실패했습니다." };
      }

      const taskId = await requestSunoRemix(
        {
          uploadUrl: sourceAudioUrl,
          title: `${resolvedSourceTitle ?? "리믹스"} Remix`,
          styleDescription: styleResult.styleDescription,
          prompt: instrumental ? undefined : (lyrics ?? DEFAULT_REMIX_PROMPT),
          instrumental,
          styleWeight: styleWeight ?? undefined,
          weirdnessConstraint: weirdnessConstraint ?? undefined,
          audioWeight: audioWeight ?? undefined,
          vocalGender: instrumental ? undefined : toSunoVocalGender(vocalGender),
          durationSeconds,
        },
        sunoKey,
      );

      await supabase.from("music_track_remixes").update({ task_id: taskId }).eq("id", remix.id);
    }

    await logProgramUsage({
      userId: user.id,
      action: "create_remix",
      metadata: { count: clampedCount, sourceVariantId, instrumental },
    });

    revalidatePath("/remix");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "리믹스 요청 중 오류가 발생했습니다." };
  }
}

function clamp01(value: FormDataEntryValue | null): number | null {
  if (value == null || value === "") return null;
  const num = Number(value);
  if (Number.isNaN(num)) return null;
  return Math.min(Math.max(num, 0), 1);
}

export interface SyncRemixStatusState {
  error?: string;
  status?: RemixStatus;
}

/** 웹훅이 도달하지 못했을 때 대비한 수동 동기화 — /generate/upload-cover도 같은 record-info로 조회된다. */
export async function syncRemixStatusAction(remixId: string): Promise<SyncRemixStatusState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: remix, error: remixError } = await supabase
    .from("music_track_remixes")
    .select("id, user_id, task_id, status")
    .eq("id", remixId)
    .eq("user_id", user.id)
    .single();
  if (remixError || !remix) return { error: "리믹스를 찾을 수 없습니다." };
  if (remix.status !== "generating") return { status: remix.status };
  if (!remix.task_id) return { error: "이 리믹스는 아직 Suno에 생성 요청이 전달되지 않았습니다." };

  const sunoKey = await resolveApiKey(supabase, user.id, "suno");
  if (!sunoKey) return { error: "Suno API 키가 없습니다. 설정 페이지에서 본인 키를 등록해주세요." };

  try {
    const result = await checkSunoGenerationStatus(remix.task_id, sunoKey);

    if (result.state === "processing") return { status: "generating" };
    if (result.state === "failed") {
      await markRemixFailed(supabase, remix, result.error);
      revalidatePath("/remix");
      return { status: "failed" };
    }

    const { savedCount } = await saveSunoRemixResult(supabase, remix, result.tracks);
    if (savedCount === 0) {
      await markRemixFailed(supabase, remix, "Suno가 오디오 URL을 반환하지 않았습니다.");
      revalidatePath("/remix");
      return { status: "failed" };
    }

    revalidatePath("/remix");
    return { status: "completed" };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "상태 확인 중 오류가 발생했습니다." };
  }
}

export interface DeleteRemixState {
  error?: string;
}

/** 리믹스 카드를 삭제한다 (완료/실패 상태만 — 생성 중인 건 웹훅 도착 후 정리하도록 막는다). */
export async function deleteRemixAction(remixId: string): Promise<DeleteRemixState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: remix, error: remixError } = await supabase
    .from("music_track_remixes")
    .select("id, status")
    .eq("id", remixId)
    .eq("user_id", user.id)
    .single();
  if (remixError || !remix) return { error: "리믹스를 찾을 수 없습니다." };
  if (remix.status === "generating") {
    return { error: "생성 중인 리믹스는 삭제할 수 없습니다. 완료되거나 실패한 뒤 삭제해주세요." };
  }

  const { error: deleteError } = await supabase.from("music_track_remixes").delete().eq("id", remixId).eq("user_id", user.id);
  if (deleteError) return { error: deleteError.message };

  revalidatePath("/remix");
  return {};
}
