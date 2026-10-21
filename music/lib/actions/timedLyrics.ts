"use server";

import { requireProgramAccess, logProgramUsage } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/apiKeys";
import { requestSunoTimestampedLyrics } from "@/lib/ai/suno";
import { linesFromAlignedWords, type TimedLine } from "@/lib/sunoAlign";
import { toLrc, toSrt } from "@/lib/lyricsFormat";

// 타임스탬프 가사(2026-10-21 Suno V6 1차 기능, docs/PLAN_20261021_SUNO_V6_FEATURES.md ①).
// 회원 본인 Suno 키로 곡의 단어별 시간을 받아 줄 시간표 + LRC·SRT 자막을 돌려준다. DB에 저장하지 않는다(필요할 때마다 받음).
export interface TimedLyricsState {
  error?: string;
  needsApiKey?: string;
  lines?: TimedLine[];
  lrc?: string;
  srt?: string;
}

export async function getTimedLyricsAction(variantId: string): Promise<TimedLyricsState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: variant } = await supabase
    .from("music_track_variants")
    .select("id, track_id, suno_audio_id")
    .eq("id", variantId)
    .eq("user_id", user.id)
    .single();
  if (!variant?.suno_audio_id) return { error: "이 곡은 Suno 오디오 ID가 없어 시간 가사를 받을 수 없습니다." };

  const { data: track } = await supabase
    .from("music_tracks")
    .select("title, task_id, mode")
    .eq("id", variant.track_id)
    .eq("user_id", user.id)
    .single();
  if (!track?.task_id) return { error: "원곡의 Suno 작업 ID가 없어 시간 가사를 받을 수 없습니다." };
  if (track.mode === "instrumental") return { error: "연주곡에는 가사가 없습니다." };

  const sunoKey = await resolveApiKey(supabase, user.id, "suno");
  if (!sunoKey) return { needsApiKey: "suno" };

  try {
    const words = await requestSunoTimestampedLyrics({ sourceTaskId: track.task_id, audioId: variant.suno_audio_id }, sunoKey);
    const lines = linesFromAlignedWords(words);
    if (!lines.length) return { error: "Suno가 이 곡의 시간 가사를 주지 않았습니다(가사가 비어 있음)." };
    await logProgramUsage({ userId: user.id, action: "timed_lyrics", metadata: { variantId, lines: lines.length } });
    return { lines, lrc: toLrc(lines, track.title), srt: toSrt(lines) };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "시간 가사를 받지 못했습니다." };
  }
}
