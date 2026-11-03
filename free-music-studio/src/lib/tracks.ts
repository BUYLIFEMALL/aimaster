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
};

export type Track = TrackInput & { created_at: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const DEVICES = ["cuda", "mps", "cpu"];

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

  if (!UUID.test(id)) return { ok: false, error: "곡 번호가 올바르지 않습니다." };
  if (songId && !UUID.test(songId)) return { ok: false, error: "곡 번호가 올바르지 않습니다." };
  if (title.length > LIMITS.title) return { ok: false, error: `곡 제목은 ${LIMITS.title}자까지 쓸 수 있습니다.` };
  if (style.length > LIMITS.style || lyrics.length > LIMITS.lyrics) return { ok: false, error: "스타일·가사가 너무 깁니다." };
  if (!(DURATIONS as readonly number[]).includes(duration)) return { ok: false, error: "곡 길이가 올바르지 않습니다." };
  if (!DEVICES.includes(device)) return { ok: false, error: "만든 장치 정보가 올바르지 않습니다." };

  return { ok: true, value: { id, song_id: songId, title, style_prompt: style, lyrics, duration_sec: duration, device } };
}
