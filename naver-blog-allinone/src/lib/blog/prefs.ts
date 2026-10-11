// 글 생성 옵션 기본값 저장(이 브라우저의 localStorage). 읽을 때마다 허용 목록으로 다시 검증해 잘못된 값이 들어와도 화면이 깨지지 않게 한다.
// 주제·키워드·발행 목적처럼 글마다 달라지는 값은 저장하지 않는다. AI 모델 선택은 모델 카드가 따로 자동 저장한다.
import { COLOR_THEMES } from "./article";
import { BLOG_PERSONAS } from "./personas";
import { clampTargetLength } from "./pipeline";
import { isWritingStyle, isWritingTone, type WritingStyle, type WritingTone } from "./styles";
import { IMAGE_RATIOS, type ImageRatio } from "./types";

export interface GenPrefs {
  themeId: string;
  withThumbnail: boolean;
  bodyImages: number;
  autoImages: boolean;
  thumbnailText: boolean;
  ratio: ImageRatio;
  interactive: boolean;
  tone: WritingTone;
  style: WritingStyle;
  targetLength: number;
  personaId: string | null;
}

export const GEN_PREFS_KEY = "naver_blog_allinone_gen_prefs_v1";
export const PLACES_PREFS_KEY = "naver_blog_allinone_places_prefs_v1";

/** 어떤 값이 들어와도 허용된 항목만 남긴다(없는 항목은 빠진다 = 화면 기본값 유지). */
export function sanitizePrefs(raw: unknown): Partial<GenPrefs> {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out: Partial<GenPrefs> = {};
  if (typeof r.themeId === "string" && COLOR_THEMES.some((t) => t.id === r.themeId)) out.themeId = r.themeId;
  if (typeof r.withThumbnail === "boolean") out.withThumbnail = r.withThumbnail;
  if (typeof r.bodyImages === "number" && Number.isInteger(r.bodyImages) && r.bodyImages >= 0 && r.bodyImages <= 4) out.bodyImages = r.bodyImages;
  if (typeof r.autoImages === "boolean") out.autoImages = r.autoImages;
  if (typeof r.thumbnailText === "boolean") out.thumbnailText = r.thumbnailText;
  if (IMAGE_RATIOS.some((x) => x.value === r.ratio)) out.ratio = r.ratio as ImageRatio;
  if (typeof r.interactive === "boolean") out.interactive = r.interactive;
  if (isWritingTone(r.tone)) out.tone = r.tone;
  if (isWritingStyle(r.style)) out.style = r.style;
  if (typeof r.targetLength === "number" && Number.isFinite(r.targetLength)) out.targetLength = clampTargetLength(r.targetLength);
  if (r.personaId === null || (typeof r.personaId === "string" && BLOG_PERSONAS.some((p) => p.id === r.personaId))) out.personaId = r.personaId as string | null;
  return out;
}

type ReadStorage = Pick<Storage, "getItem">;
type WriteStorage = Pick<Storage, "setItem" | "removeItem">;

/** 저장된 기본값. 저장한 적이 없거나 읽을 수 없으면 null. */
export function loadGenPrefs(storage: ReadStorage, key: string = GEN_PREFS_KEY): Partial<GenPrefs> | null {
  try {
    const raw = storage.getItem(key);
    if (raw === null) return null;
    return sanitizePrefs(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveGenPrefs(storage: WriteStorage, prefs: Partial<GenPrefs>, key: string = GEN_PREFS_KEY): boolean {
  try {
    storage.setItem(key, JSON.stringify({ ...sanitizePrefs(prefs), savedAt: new Date().toISOString() }));
    return true;
  } catch {
    return false;
  }
}

export function clearGenPrefs(storage: WriteStorage, key: string = GEN_PREFS_KEY): boolean {
  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/** 저장 시각(없으면 null) */
export function prefsSavedAt(storage: ReadStorage, key: string = GEN_PREFS_KEY): string | null {
  try {
    const raw = storage.getItem(key);
    if (raw === null) return null;
    const at = (JSON.parse(raw) as { savedAt?: unknown }).savedAt;
    return typeof at === "string" ? at : null;
  } catch {
    return null;
  }
}
