// 곡 한 건의 입력 규칙. 화면·API·시험이 같은 규칙을 쓴다(서버에서 한 번 더 검사).
// 음원 파일은 회원 PC 엔진에 두고 서버에는 글 정보만 저장한다(플랜 §3).

export const SONGS_TABLE = "free_music_songs";

// 목표 길이 — 2·3·4·5분(기본 3분, v1.08). 30초·1분은 CPU PC에서 빨리 들어 보는 용도.
export const MUSIC_DURATIONS = [30, 60, 120, 180, 240, 300] as const;
// 효과음(가사 칸 [SFX], Stable Audio 3 전용, 2026-11-05) — 공식 안내 「길이는 소리에 맞게」, 보고서 효과음 평가는 5초
export const SFX_DURATIONS = [3, 5, 10, 15, 20, 30] as const;
export const DEFAULT_SFX_DURATION = 5;
/** 곡·효과음 길이 전체(결과 기록 검사용) */
export const DURATIONS = [...SFX_DURATIONS.filter((d) => d < 30), ...MUSIC_DURATIONS] as const;
export const DEFAULT_DURATION = 180;
const SFX_MARK = "[sfx]";
/** 가사 칸이 효과음 표시인가 */
export const isSfxLyrics = (lyrics: string) => lyrics.trim().toLowerCase() === SFX_MARK;

export const LIMITS = { title: 80, style: 400, lyrics: 4000 } as const;

/** art_prompt: 앨범 그림 설명(영어, 선택, 2026-11-05) — AI 작곡 기획이 준 것을 저장해 앨범 그림 만들기에 쓴다 */
export type SongInput = { title: string; style_prompt: string; lyrics: string; duration_sec: number; art_prompt: string; project_id: string | null };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ART_LIMIT = 1000;

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
  const allowed: readonly number[] = isSfxLyrics(lyrics) ? SFX_DURATIONS : MUSIC_DURATIONS;
  if (!allowed.includes(duration)) return { ok: false, error: "곡 길이를 목록에서 골라 주세요." };

  const art = typeof b.art_prompt === "string" ? b.art_prompt.trim() : "";
  if (art.length > ART_LIMIT) return { ok: false, error: `앨범 그림 설명은 ${ART_LIMIT}자까지 쓸 수 있습니다.` };

  // 초안의 프로젝트(2026-11-06, 원본 boks-music 프로젝트 안에서 만들기) — 본인 프로젝트인지는 API가 확인한다
  const project = b.project_id ?? null;
  if (project !== null && (typeof project !== "string" || !UUID_RE.test(project))) return { ok: false, error: "프로젝트가 올바르지 않습니다." };

  return { ok: true, value: { title, style_prompt: style, lyrics, duration_sec: duration, art_prompt: art, project_id: project as string | null } };
}
