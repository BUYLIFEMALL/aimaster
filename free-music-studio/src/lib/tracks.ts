// 「모든 음악」 — 내 PC 엔진으로 만든 노래 한 곡의 기록. 음원 파일은 회원 PC 엔진 보관 폴더에
// 같은 id(uuid) 이름으로 있고, 서버에는 글 정보만 남긴다(플랜 §3, 30일 정리 대상).
import { DURATIONS, LIMITS } from "./songs";
import { parseLyricTiming, type LyricTiming } from "./lyricTiming";

export const TRACKS_TABLE = "free_music_tracks";

export type TrackInput = {
  id: string;
  song_id: string | null;
  /** 처음 기록할 때 넣을 프로젝트(C-33, 2026-11-09 「가져온 음악」 커버) — 본인 프로젝트인지는 API가 확인 */
  project_id?: string | null;
  title: string;
  style_prompt: string;
  lyrics: string;
  duration_sec: number;
  device: string;
  kind: TrackKind;
  license: TrackLicense;
  /** 커버·부분 수정의 원곡(보관함 곡) 번호 — 원본 boks-music parentId, 2026-11-05 */
  parent_id: string | null;
};

export type Track = TrackInput & {
  created_at: string;
  project_id: string | null;
  /** 휴지통에 넣은 시각(2026-11-06), 아니면 null */
  trashed_at?: string | null;
  /** 즐겨찾기(2026-11-08) — 30일 정리에서 빠짐 */
  favorite?: boolean;
  /** 가사 시간(2026-11-06, 원본 lyric-timing) */
  lyric_timing?: LyricTiming | null;
};
export type TrackPatch = { favorite?: boolean; project_id?: string | null; title?: string; lyrics?: string; lyric_timing?: LyricTiming | null };

/** 「모든 음악」 → 「가져온 음악」으로 커버 원곡을 넘기는 자리(sessionStorage, 파일은 엔진 보관함에서 다시 받음) */
export const COVER_SOURCE_KEY = "fms.coverSource";
export type CoverSource = { id: string; title: string; style_prompt: string; lyrics: string; kind: TrackKind };

/** 상업용(ACE-Step) / 비상업용(YuE2, CC BY-NC 4.0) — v1.10, DB 칸 free_music_tracks.license */
export type TrackLicense = "commercial" | "noncommercial";
const LICENSES: TrackLicense[] = ["commercial", "noncommercial"];

/** 노래 만들기 / 가져온 음악 커버 / 일부만 다시 만들기(v1.06) / 마스터링본(2026-11-06, 원본 boks-music MASTERED) */
export type TrackKind = "text2music" | "cover" | "repaint" | "master";
export const KIND_LABEL: Record<TrackKind, string> = { text2music: "", cover: "커버", repaint: "부분 수정", master: "마스터링" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const DEVICES = ["cuda", "mps", "cpu"];
const KINDS: TrackKind[] = ["text2music", "cover", "repaint", "master"];
/** 가져온 음악은 원곡 길이를 따른다 — ACE-Step 허용 범위 10~600초 */
export const SOURCE_MIN_SEC = 10;
export const SOURCE_MAX_SEC = 600;

/**
 * 곡 기록 고치기(PATCH) — 프로젝트·제목·가사 중 보낸 칸만. 원본 boks-music `updateTrackText`(MIT)처럼 제목은 비울 수 없다(2026-11-06).
 * project_id는 형식만 보고, 본인 프로젝트인지는 API가 확인한다.
 */
export function parseTrackPatch(body: unknown): { ok: true; value: TrackPatch } | { ok: false; error: string } {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const value: TrackPatch = {};
  // 즐겨찾기(2026-11-08)
  if ("favorite" in b) {
    if (typeof b.favorite !== "boolean") return { ok: false, error: "즐겨찾기 값이 올바르지 않습니다." };
    value.favorite = b.favorite;
  }
  // 가사 시간(2026-11-06) — null이면 지운다
  if ("lyric_timing" in b) {
    if (b.lyric_timing === null) value.lyric_timing = null;
    else {
      const t = parseLyricTiming(b.lyric_timing);
      if (!t) return { ok: false, error: "가사 시간 정보가 올바르지 않습니다." };
      value.lyric_timing = t;
    }
  }
  if ("project_id" in b) {
    if (b.project_id !== null && (typeof b.project_id !== "string" || !UUID.test(b.project_id))) return { ok: false, error: "프로젝트가 올바르지 않습니다." };
    value.project_id = b.project_id as string | null;
  }
  if ("title" in b) {
    const title = typeof b.title === "string" ? b.title.trim() : "";
    if (!title) return { ok: false, error: "제목을 입력해 주세요." };
    if (title.length > LIMITS.title) return { ok: false, error: `제목은 ${LIMITS.title}자까지입니다.` };
    value.title = title;
  }
  if ("lyrics" in b) {
    if (typeof b.lyrics !== "string") return { ok: false, error: "가사가 올바르지 않습니다." };
    if (b.lyrics.length > LIMITS.lyrics) return { ok: false, error: `가사는 ${LIMITS.lyrics}자까지입니다.` };
    value.lyrics = b.lyrics;
  }
  if (!Object.keys(value).length) return { ok: false, error: "바꿀 내용이 없습니다." };
  return { ok: true, value };
}

/** 생성 직후 화면이 보내는 기록을 검사한다. id는 브라우저가 만든 uuid(엔진 파일 이름과 같음). */
export function parseTrackInput(body: unknown): { ok: true; value: TrackInput } | { ok: false; error: string } {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const id = typeof b.id === "string" ? b.id : "";
  const songId = typeof b.song_id === "string" && b.song_id ? b.song_id : null;
  const title = (typeof b.title === "string" ? b.title.trim() : "") || "제목 없는 노래";
  const style = typeof b.style_prompt === "string" ? b.style_prompt.trim() : "";
  const lyrics = typeof b.lyrics === "string" ? b.lyrics.replace(/\r\n/g, "\n").trim() : "";
  const duration = Number(b.duration_sec);
  const device = typeof b.device === "string" ? b.device : "";
  const kind = (b.kind === undefined ? "text2music" : b.kind) as TrackKind;
  const license = (b.license === undefined ? "commercial" : b.license) as TrackLicense;
  const parentId = typeof b.parent_id === "string" && b.parent_id ? b.parent_id : null;
  const projectId = typeof b.project_id === "string" && b.project_id ? b.project_id : null;

  if (!UUID.test(id)) return { ok: false, error: "곡 번호가 올바르지 않습니다." };
  if (projectId && !UUID.test(projectId)) return { ok: false, error: "프로젝트가 올바르지 않습니다." };
  if (songId && !UUID.test(songId)) return { ok: false, error: "곡 번호가 올바르지 않습니다." };
  if (parentId && (!UUID.test(parentId) || parentId === id || kind === "text2music")) return { ok: false, error: "원곡 번호가 올바르지 않습니다." };
  if (title.length > LIMITS.title) return { ok: false, error: `곡 제목은 ${LIMITS.title}자까지 쓸 수 있습니다.` };
  if (style.length > LIMITS.style || lyrics.length > LIMITS.lyrics) return { ok: false, error: "스타일·가사가 너무 깁니다." };
  if (!KINDS.includes(kind)) return { ok: false, error: "곡 종류가 올바르지 않습니다." };
  if (!LICENSES.includes(license)) return { ok: false, error: "사용 범위(상업용·비상업용)가 올바르지 않습니다." };
  // YuE2는 새 곡 만들기·커버(엔진 0.8.0, 원곡 멜로디 받아 적기)를 한다 — 마스터링본은 원곡처럼 비상업용. 부분 수정은 YuE2에 없다
  // (2026-11-09 마스터PC: YuE2 커버 2곡이 이 검사에 막혀 「모든 음악」 기록이 안 남던 것)
  if (license === "noncommercial" && kind === "repaint") return { ok: false, error: "비상업용 엔진은 부분 수정을 할 수 없습니다." };
  if (kind === "master" && !parentId) return { ok: false, error: "마스터링본은 원곡 번호가 있어야 합니다." };
  const durationOk =
    kind === "text2music"
      ? (DURATIONS as readonly number[]).includes(duration)
      : kind === "master"
        ? Number.isInteger(duration) && duration >= 1 && duration <= SOURCE_MAX_SEC // 원곡 길이 그대로(효과음은 1초부터)
        : Number.isInteger(duration) && duration >= SOURCE_MIN_SEC && duration <= SOURCE_MAX_SEC;
  if (!durationOk) return { ok: false, error: "곡 길이가 올바르지 않습니다." };
  if (!DEVICES.includes(device)) return { ok: false, error: "만든 장치 정보가 올바르지 않습니다." };

  return { ok: true, value: { id, song_id: songId, title, style_prompt: style, lyrics, duration_sec: duration, device, kind, license, parent_id: parentId, ...(projectId ? { project_id: projectId } : {}) } };
}
