import type { Script } from "./script";

// v1.04 부가 기능의 순수 함수(서버·클라이언트 공용, 테스트 대상): 인스타 문구·이어서 만들기·이미지 합치기·내 작품 개수 제한.

export interface InstaCopy { caption: string; hashtags: string[] }

const MAX_CAPTION = 2000;

/** 해시태그 하나를 `#단어` 형태로 정리(공백·특수문자 제거). 쓸 수 없으면 null */
export function cleanHashtag(raw: unknown): string | null {
  const s = String(raw ?? "").trim().replace(/^#+/, "").replace(/[\s#.,!?'"`~@$%^&*()+=[\]{}|\\/:;<>]/g, "");
  if (!s || s.length > 40) return null;
  return `#${s}`;
}

/** AI 응답 {caption, hashtags[]} 정리: 해시태그는 중복 제거 후 최대 10개, 3개 미만이면 실패(null) */
export function normalizeInsta(raw: unknown): InstaCopy | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const caption = String(r.caption ?? r.description ?? "").replace(/\u0000/g, "").trim().slice(0, MAX_CAPTION);
  if (!caption) return null;
  const list = Array.isArray(r.hashtags) ? r.hashtags : [];
  const tags = [...new Set(list.map(cleanHashtag).filter((t): t is string => !!t))].slice(0, 10);
  if (tags.length < 3) return null;
  return { caption, hashtags: tags };
}

/** 복사용 전체 문구(본문 + 빈 줄 + 해시태그) */
export function instaText(c: InstaCopy): string {
  return `${c.caption}\n\n${c.hashtags.join(" ")}`;
}

/**
 * 후속편 대본을 이전 화에 잇는다. 캐릭터 그림을 그대로 다시 쓰기 위해 등장인물 목록은 이전 화 것을 유지하고,
 * 새 대본의 화자 이름이 등장인물에 없으면 그대로 두되(생각·없음 포함) 컷 4개만 새 것으로 바꾼다.
 */
export function continueScript(prev: Script, next: Script): Script {
  return { characters: prev.characters.map((c) => ({ ...c })), panels: next.panels.map((p, i) => ({ ...p, panel: i + 1 })) };
}

export interface StackRect { x: number; y: number; w: number; h: number }

/**
 * 이미지 여러 장을 세로로 잇는 배치. 모든 이미지를 같은 너비(targetWidth, 기본은 가장 넓은 이미지·최대 maxWidth)로 맞추고
 * 사이에 gap을 둔다. 결과 캔버스가 maxHeight를 넘으면 전체를 같은 비율로 줄인다(브라우저 캔버스 한도 대비).
 */
export function stackLayout(sizes: { w: number; h: number }[], o: { gap?: number; maxWidth?: number; maxHeight?: number } = {}): { width: number; height: number; rects: StackRect[] } {
  const valid = sizes.filter((s) => s.w > 0 && s.h > 0);
  if (valid.length !== sizes.length || sizes.length === 0) throw new Error("이미지 크기가 올바르지 않습니다.");
  const maxWidth = o.maxWidth ?? 1600;
  const maxHeight = o.maxHeight ?? 16000;
  let width = Math.min(maxWidth, Math.max(...sizes.map((s) => s.w)));
  let gap = o.gap ?? 0;
  let heights = sizes.map((s) => (s.h * width) / s.w);
  let height = heights.reduce((a, b) => a + b, 0) + gap * (sizes.length - 1);
  if (height > maxHeight) {
    const k = maxHeight / height;
    width *= k; gap *= k; heights = heights.map((h) => h * k); height = maxHeight;
  }
  const rects: StackRect[] = [];
  let y = 0;
  for (const h of heights) { rects.push({ x: 0, y: Math.round(y), w: Math.round(width), h: Math.round(h) }); y += h + gap; }
  return { width: Math.round(width), height: Math.round(height), rects };
}

export const MAX_WORKS = 20;

/** 내 작품 목록: 최신순으로 정렬해 최대 max개만 남기고, 넘친 항목의 id를 돌려준다(오래된 것부터 삭제) */
export function trimWorks<T extends { id: string; createdAt: number }>(list: T[], max = MAX_WORKS): { keep: T[]; drop: string[] } {
  const sorted = [...list].sort((a, b) => b.createdAt - a.createdAt);
  return { keep: sorted.slice(0, max), drop: sorted.slice(max).map((w) => w.id) };
}
