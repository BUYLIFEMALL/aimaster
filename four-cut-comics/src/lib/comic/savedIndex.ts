import type { Script } from "./script";

// 서버 보관함의 목록(index.json) 계산 — 순수 함수(테스트 대상). 실제 저장소 입출력은 src/lib/saved.ts.
// DB 테이블 없이 비공개 버킷 안 `<userId>/index.json`에 회원별 목록을 두고 이미지는 `<userId>/<id>.jpg`로 저장한다.

export interface SavedMeta {
  id: string;
  title: string;
  episode: number;
  panelCount: number;
  aspect: string;
  styleId: string;
  script: Script;
  bytes: number;
  createdAt: string; // ISO
  expiresAt: string | null; // ISO. v1.24부터 최대 만든 날 + 30일(옛 null·90일 항목도 30일로 계산 — splitExpired)
  /** v1.29: 완성작 실제 크기(옛 항목은 없음) — 형식 바꾸기 규격 고르기용 */
  width?: number;
  height?: number;
  /** v1.34: 이미지 변환 스튜디오에서 다시 저장한 「그림만 있는 작품」(대본은 빈 값) */
  imported?: "image-convert-studio";
  /** v1.34: 그림 파일 형식(없으면 옛 항목 = jpg) */
  ext?: ImageExt;
}

export type ImageExt = "jpg" | "png" | "webp";
export const IMAGE_MIME: Record<ImageExt, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

/** 파일 첫 바이트(서명)로 형식을 판별한다 — 보낸 쪽이 적은 형식은 믿지 않는다(v1.34) */
export function detectImageExt(b: Uint8Array): ImageExt | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return "png";
  if (b.length >= 12 && String.fromCharCode(...b.subarray(0, 4)) === "RIFF" && String.fromCharCode(...b.subarray(8, 12)) === "WEBP") return "webp";
  return null;
}

/** 다시 저장한 그림만 있는 작품의 목록 항목(빈 대본으로 기존 목록 검사 통과) */
export function importedMeta(o: { id: string; ext: ImageExt; bytes: number; now?: Date }): SavedMeta {
  const now = o.now ?? new Date();
  return {
    id: o.id, title: "변환 스튜디오에서 다시 저장", episode: 0, panelCount: 0, aspect: "", styleId: "",
    script: { characters: [], panels: [] }, bytes: o.bytes, createdAt: now.toISOString(), expiresAt: expiresAtFor(MAX_RETENTION_DAYS, now),
    imported: "image-convert-studio", ext: o.ext,
  };
}

export const MAX_SAVED = 30;
/** 보관 기간(일). 0 = 직접 삭제할 때까지 */
// v1.24: 회원 생성 데이터 30일 규칙 — 「직접 지울 때까지(0)」·90일 선택지를 없앰
export const RETENTION_DAYS = [7, 30] as const;
export const MAX_RETENTION_DAYS = 30;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isSavedId(v: unknown): v is string { return typeof v === "string" && UUID.test(v); }
export function normalizeRetention(v: unknown): number {
  return typeof v === "number" && (RETENTION_DAYS as readonly number[]).includes(v) ? v : 30;
}
export function expiresAtFor(days: number, now: Date = new Date()): string {
  const d = days > 0 && days <= MAX_RETENTION_DAYS ? days : MAX_RETENTION_DAYS;
  return new Date(now.getTime() + d * 86_400_000).toISOString();
}

/** 실제 만료 시각: 저장된 만료일과 「만든 날 + 30일」 중 빠른 쪽(옛 null·90일 항목도 30일을 넘지 않게) */
export function effectiveExpiry(m: Pick<SavedMeta, "createdAt" | "expiresAt">): number {
  const cap = new Date(m.createdAt).getTime() + MAX_RETENTION_DAYS * 86_400_000;
  const own = m.expiresAt ? new Date(m.expiresAt).getTime() : Number.POSITIVE_INFINITY;
  const c = Number.isFinite(cap) ? cap : Number.POSITIVE_INFINITY;
  return Math.min(Number.isNaN(own) ? Number.POSITIVE_INFINITY : own, c);
}

/** 저장소에서 읽은 index.json을 검증한다(깨진 항목은 버림) */
export function parseIndex(raw: unknown): SavedMeta[] {
  const list = Array.isArray(raw) ? raw : Array.isArray((raw as { items?: unknown })?.items) ? (raw as { items: unknown[] }).items : [];
  return list.filter((m): m is SavedMeta => {
    const o = m as Partial<SavedMeta>;
    return !!o && isSavedId(o.id) && typeof o.title === "string" && typeof o.createdAt === "string" && !!o.script && Array.isArray(o.script.panels);
  });
}

/** 만료된 항목과 남길 항목을 나눈다 */
export function splitExpired(list: SavedMeta[], now: Date = new Date()): { keep: SavedMeta[]; expired: SavedMeta[] } {
  const t = now.getTime();
  const expired = list.filter((m) => effectiveExpiry(m) <= t);
  return { keep: list.filter((m) => !expired.includes(m)), expired };
}

/** 새 항목을 맨 앞에 넣고 최신순 max개만 남긴다. 넘친(오래된) 항목은 drop으로 돌려 이미지도 지우게 한다 */
export function addToIndex(list: SavedMeta[], item: SavedMeta, max = MAX_SAVED): { keep: SavedMeta[]; drop: SavedMeta[] } {
  const all = [item, ...list.filter((m) => m.id !== item.id)].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { keep: all.slice(0, max), drop: all.slice(max) };
}
