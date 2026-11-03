// 「모든 음악」 — 내 PC 엔진으로 만든 노래 한 곡의 기록. 음원 파일은 회원 PC 엔진 보관 폴더에
// 같은 id(uuid) 이름으로 있고, 서버에는 글 정보만 남긴다(플랜 §3, 30일 정리 대상).
import { DURATIONS, LIMITS } from "./songs";

export const TRACKS_TABLE = "free_music_tracks";

export type TrackInput = {
  id: string;
  song_id: string | null;
  title: string;
  style_prompt: string;
  lyrics: string;
  duration_sec: number;
  device: string;
  kind: TrackKind;
  license: TrackLicense;
};

export type Track = TrackInput & { created_at: string; project_id: string | null };

/** 상업용(ACE-Step) / 비상업용(YuE2, CC BY-NC 4.0) — v1.10, DB 칸 free_music_tracks.license */
export type TrackLicense = "commercial" | "noncommercial";
const LICENSES: TrackLicense[] = ["commercial", "noncommercial"];

/** 노래 만들기 / 가져온 음악 커버 / 일부만 다시 만들기(v1.06) */
export type TrackKind = "text2music" | "cover" | "repaint";
export const KIND_LABEL: Record<TrackKind, string> = { text2music: "", cover: "커버", repaint: "부분 수정" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const DEVICES = ["cuda", "mps", "cpu"];
const KINDS: TrackKind[] = ["text2music", "cover", "repaint"];
/** 가져온 음악은 원곡 길이를 따른다 — ACE-Step 허용 범위 10~600초 */
export const SOURCE_MIN_SEC = 10;
export const SOURCE_MAX_SEC = 600;

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

  if (!UUID.test(id)) return { ok: false, error: "곡 번호가 올바르지 않습니다." };
  if (songId && !UUID.test(songId)) return { ok: false, error: "곡 번호가 올바르지 않습니다." };
  if (title.length > LIMITS.title) return { ok: false, error: `곡 제목은 ${LIMITS.title}자까지 쓸 수 있습니다.` };
  if (style.length > LIMITS.style || lyrics.length > LIMITS.lyrics) return { ok: false, error: "스타일·가사가 너무 깁니다." };
  if (!KINDS.includes(kind)) return { ok: false, error: "곡 종류가 올바르지 않습니다." };
  if (!LICENSES.includes(license)) return { ok: false, error: "사용 범위(상업용·비상업용)가 올바르지 않습니다." };
  // YuE2는 지금 새 곡 만들기만 한다
  if (license === "noncommercial" && kind !== "text2music") return { ok: false, error: "비상업용 엔진은 새 곡 만들기만 할 수 있습니다." };
  const durationOk =
    kind === "text2music"
      ? (DURATIONS as readonly number[]).includes(duration)
      : Number.isInteger(duration) && duration >= SOURCE_MIN_SEC && duration <= SOURCE_MAX_SEC;
  if (!durationOk) return { ok: false, error: "곡 길이가 올바르지 않습니다." };
  if (!DEVICES.includes(device)) return { ok: false, error: "만든 장치 정보가 올바르지 않습니다." };

  return { ok: true, value: { id, song_id: songId, title, style_prompt: style, lyrics, duration_sec: duration, device, kind, license } };
}
