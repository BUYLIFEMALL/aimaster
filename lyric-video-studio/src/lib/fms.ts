import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { UserError } from "@/lib/errors";
import { fmsTimedLines, type FmsCue, type FmsTimedLine } from "@/lib/fmsLyrics";

// v1.13 AI 무료음악 자동화(free-music-studio)에서 회원 본인이 만든 곡의 제목·가사·가사 시간을 가져온다.
// 공용 DB free_music_tracks를 읽기만 하고(쓰기 없음) 회원 user_id로 거른다.
// 음원은 회원 PC 엔진에만 있어 서버에 없다 — 무료음악 화면이 브라우저 안에서 이 창으로 건네준다(FmsImportCard).
type Row = { id: string; title: string | null; lyrics: string | null; lyric_timing: { cues?: FmsCue[] } | null; kind: string | null; trashed_at: string | null; duration_sec: number | null };

export interface FmsSong { id: string; title: string; lyrics: string; timedLines: FmsTimedLine[] | null; instrumental: boolean }

export async function getFmsSong(userId: string, trackId: string): Promise<FmsSong> {
  const { data, error } = await createAdminClient()
    .from("free_music_tracks")
    .select("id, title, lyrics, lyric_timing, kind, trashed_at, duration_sec")
    .eq("id", trackId).eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  const row = data as Row | null;
  if (!row || row.trashed_at) throw new UserError(404, "곡을 찾지 못했습니다. AI 무료음악 자동화에서 내가 만든 곡만 가져올 수 있습니다.");
  const lyrics = (row.lyrics ?? "").trim();
  return {
    id: row.id,
    title: (row.title || "제목 없음").slice(0, 80),
    lyrics,
    timedLines: lyrics ? fmsTimedLines(row.lyric_timing, row.duration_sec) : null,
    instrumental: !lyrics || row.kind === "instrumental" || row.kind === "sfx",
  };
}
