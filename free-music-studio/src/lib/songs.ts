// 곡 한 건의 입력 규칙. 화면·API·시험이 같은 규칙을 쓴다(서버에서 한 번 더 검사).
// 음원 파일은 회원 PC 엔진에 두고 서버에는 글 정보만 저장한다(플랜 §3).

export const SONGS_TABLE = "free_music_songs";

// 목표 길이 — 2·3·4·5분(기본 3분, v1.08). 30초·1분은 CPU PC에서 빨리 들어 보는 용도.
export const DURATIONS = [30, 60, 120, 180, 240, 300] as const;
export const DEFAULT_DURATION = 180;

export const LIMITS = { title: 80, style: 400, lyrics: 4000 } as const;

export type SongInput = { title: string; style_prompt: string; lyrics: string; duration_sec: number };

export type Song = SongInput & { id: string; created_at: string; updated_at: string };

/** 입력을 다듬고 검사한다. 틀리면 회원에게 보여 줄 한국어 문장을 돌려준다. */
export function parseSongInput(body: unknown): { ok: true; value: SongInput } | { ok: false; error: string } {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const title = typeof b.title === "string" ? b.title.trim() : "";
  const style = typeof b.style_prompt === "string" ? b.style_prompt.trim() : "";
  const lyrics = typeof b.lyrics === "string" ? b.lyrics.replace(/\r\n/g, "\n").trim() : "";
  const duration = Number(b.duration_sec ?? DEFAULT_DURATION);

  if (!title) return { ok: false, error: "곡 제목을 입력해 주세요." };
  if (title.length > LIMITS.title) return { ok: false, error: `곡 제목은 ${LIMITS.title}자까지 쓸 수 있습니다.` };
  if (style.length > LIMITS.style) return { ok: false, error: `스타일은 ${LIMITS.style}자까지 쓸 수 있습니다.` };
  if (lyrics.length > LIMITS.lyrics) return { ok: false, error: `가사는 ${LIMITS.lyrics}자까지 쓸 수 있습니다.` };
  if (!(DURATIONS as readonly number[]).includes(duration)) return { ok: false, error: "곡 길이를 목록에서 골라 주세요." };

  return { ok: true, value: { title, style_prompt: style, lyrics, duration_sec: duration } };
}
