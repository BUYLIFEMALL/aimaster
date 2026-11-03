// 프로젝트·플레이리스트 — 원본 앱의 PROJECTS·PLAYLISTS를 웹으로(플랜 §2 「프로젝트·플레이리스트·휴지통」).
// 프로젝트: 곡을 폴더처럼 묶음(곡 하나에 하나). 플레이리스트: 곡을 순서대로 담아 이어 듣기(여러 목록 가능).

export const COLLECTIONS_TABLE = "free_music_collections";
export const PLAYLIST_ITEMS_TABLE = "free_music_playlist_items";

export type CollectionKind = "project" | "playlist";
export type Collection = { id: string; kind: CollectionKind; name: string; created_at: string; count: number };

export const NAME_MAX = 40;
export const PLAYLIST_MAX = 300;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

/** 묶음 이름 — 앞뒤 공백 정리, 1~40자 */
export function parseCollectionName(v: unknown): { ok: true; value: string } | { ok: false; error: string } {
  const name = typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";
  if (!name) return { ok: false, error: "이름을 입력해 주세요." };
  if (name.length > NAME_MAX) return { ok: false, error: `이름은 ${NAME_MAX}자까지 쓸 수 있습니다.` };
  return { ok: true, value: name };
}

export function parseKind(v: unknown): CollectionKind | null {
  return v === "project" || v === "playlist" ? v : null;
}

/** 플레이리스트 곡 순서 — uuid만, 중복 제거, 최대 300곡 */
export function parseTrackOrder(v: unknown): { ok: true; value: string[] } | { ok: false; error: string } {
  if (!Array.isArray(v)) return { ok: false, error: "곡 목록이 올바르지 않습니다." };
  const ids = [...new Set(v.filter(isUuid))];
  if (ids.length !== v.length) return { ok: false, error: "곡 목록이 올바르지 않습니다." };
  if (ids.length > PLAYLIST_MAX) return { ok: false, error: `플레이리스트에는 ${PLAYLIST_MAX}곡까지 담을 수 있습니다.` };
  return { ok: true, value: ids };
}
