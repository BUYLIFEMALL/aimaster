// 앨범(그림 보관함, v1.35 — 2026-11-07 주인님 「음악 앨범 메뉴를 좌측에」「앨범만 만들고 곡은 안만들수 있는 상황이니 별도의 기능」).
// DB에는 이름·그림 설명만, 그림 파일은 회원 PC 노래 저장 폴더 안 Albums/<id>(엔진 0.7.3). 플랜 docs/PLAN_20261107_ALBUMS.md
import { ART_PROMPT_LIMIT } from "./albumArt";

export const ALBUMS_TABLE = "free_music_albums";
export const ALBUM_TITLE_MAX = 60;

export type Album = { id: string; title: string; art_prompt: string; created_at: string };

/** 앨범 이름 — 앞뒤 공백 정리, 1~60자 */
export function parseAlbumTitle(v: unknown): { ok: true; value: string } | { ok: false; error: string } {
  const title = typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";
  if (!title) return { ok: false, error: "앨범 이름을 입력해 주세요." };
  if (title.length > ALBUM_TITLE_MAX) return { ok: false, error: `앨범 이름은 ${ALBUM_TITLE_MAX}자까지 쓸 수 있습니다.` };
  return { ok: true, value: title };
}

/** 그림 설명 — 1000자까지(넘으면 자름), 문자열이 아니면 빈 값 */
export function parseAlbumPrompt(v: unknown): string {
  return typeof v === "string" ? v.trim().slice(0, ART_PROMPT_LIMIT) : "";
}

/**
 * 앨범 화면 목록 — DB 기록과 이 PC에 있는 그림을 합친다.
 * 기록만 있고 그림이 없으면 noImage(다른 PC에서 만들었거나 그림을 지움), 그림만 있으면 「이름 없는 앨범」(30일 정리로 기록이 지워진 경우).
 */
export function mergeAlbums(rows: Album[], pcIds: string[] | null): (Album & { onPc: boolean | null; orphan?: boolean })[] {
  const pc = pcIds ? new Set(pcIds) : null;
  const known = new Set(rows.map((r) => r.id));
  const list: (Album & { onPc: boolean | null; orphan?: boolean })[] = rows.map((r) => ({ ...r, onPc: pc ? pc.has(r.id) : null }));
  for (const id of pcIds ?? []) if (!known.has(id)) list.push({ id, title: "이름 없는 앨범", art_prompt: "", created_at: "", onPc: true, orphan: true });
  return list;
}

/** 앨범 화면 주소 — 곡 제목·가사·그림 설명을 채워 열고(곡을 다 만든 뒤), 저장하면 그 곡 표지로도(track) */
export function albumsHref(fill: { title?: string; art?: string; track?: string } = {}): string {
  const q = new URLSearchParams();
  if (fill.title) q.set("title", fill.title.slice(0, ALBUM_TITLE_MAX));
  if (fill.art) q.set("art", fill.art.slice(0, ART_PROMPT_LIMIT));
  if (fill.track) q.set("track", fill.track);
  const s = q.toString();
  return s ? `/albums?${s}` : "/albums";
}
