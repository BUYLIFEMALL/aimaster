import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmsTimedLines, type FmsCue } from "./fmsLyrics";
import { timedLyricsFromLines } from "./sceneTiming";

// v1.28 AI 무료음악 자동화(free-music-studio)에서 회원 본인이 만든 곡 하나의 제목·스타일·가사·가사 시간(가사 영상 v1.13 `src/lib/fms.ts`와 같은 규칙).
// 공용 DB free_music_tracks를 읽기만 하고(쓰기 없음) 회원 user_id로 거른다. 음원은 회원 PC 엔진에만 있어 서버에 없다 —
// 무료음악 화면이 브라우저 안에서 이 창으로 건네준다(SongCard). 외부 AI 호출 없음.
type Row = { id: string; title: string | null; style_prompt: string | null; lyrics: string | null; lyric_timing: { cues?: FmsCue[] } | null; kind: string | null; trashed_at: string | null; duration_sec: number | null };

export interface FmsSong { id: string; title: string; style: string; lyrics: string; timedLyrics: string; durationS: number | null; instrumental: boolean }

export async function getFmsSong(userId: string, id: string): Promise<FmsSong | null> {
  const { data, error } = await createAdminClient()
    .from("free_music_tracks")
    .select("id, title, style_prompt, lyrics, lyric_timing, kind, trashed_at, duration_sec")
    .eq("id", id).eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  const row = data as Row | null;
  if (!row || row.trashed_at) return null;
  const lyrics = (row.lyrics ?? "").trim();
  const timed = lyrics ? fmsTimedLines(row.lyric_timing, row.duration_sec) : null;
  return {
    id: row.id,
    title: (row.title || "제목 없음").slice(0, 80),
    style: (row.style_prompt ?? "").slice(0, 1000),
    lyrics: lyrics.slice(0, 6000),
    // 장면 시각 맞추기가 읽는 「[시작:끝] 가사」 형식(AI 음악 스튜디오 Lyria 시간 가사와 같음)
    timedLyrics: timedLyricsFromLines(timed),
    durationS: row.duration_sec,
    instrumental: !lyrics || row.kind === "instrumental" || row.kind === "sfx",
  };
}
