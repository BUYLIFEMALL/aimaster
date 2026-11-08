import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmsTimedLines, type FmsCue, type FmsTimedLine } from "@/lib/fmsLyrics";

// v1.35 AI 무료음악 자동화(free-music-studio)에서 회원 본인이 만든 곡의 제목·가사 시간(가사 영상 v1.13 `src/lib/fms.ts`와 같은 규칙).
// 공용 DB free_music_tracks를 읽기만 하고(쓰기 없음) 회원 user_id로 거른다.
// 음원은 회원 PC 엔진에만 있어 서버에 없다 — 무료음악 화면이 브라우저 안에서 이 창으로 건네준다(FmsImportPanel).
type Row = { id: string; title: string | null; lyrics: string | null; lyric_timing: { cues?: FmsCue[] } | null; trashed_at: string | null; duration_sec: number | null };

export interface FmsSong { id: string; title: string; duration: number | null; timedLines: FmsTimedLine[] | null; error?: string }

/** ids 순서 그대로 — 찾지 못한 곡은 error를 담아 돌려준다(나머지는 그대로 진행) */
export async function getFmsSongs(userId: string, ids: string[]): Promise<FmsSong[]> {
  const { data, error } = await createAdminClient()
    .from("free_music_tracks")
    .select("id, title, lyrics, lyric_timing, trashed_at, duration_sec")
    .eq("user_id", userId).in("id", ids);
  if (error) throw new Error(error.message);
  const rows = new Map(((data ?? []) as Row[]).map((r) => [r.id, r]));
  return ids.map((id) => {
    const row = rows.get(id);
    if (!row || row.trashed_at) return { id, title: "찾을 수 없는 곡", duration: null, timedLines: null, error: "곡을 찾지 못했습니다(내 곡이 아니거나 휴지통에 있음)." };
    const lyrics = (row.lyrics ?? "").trim();
    return {
      id,
      title: (row.title || "제목 없음").slice(0, 80),
      duration: row.duration_sec,
      timedLines: lyrics ? fmsTimedLines(row.lyric_timing, row.duration_sec) : null,
    };
  });
}
