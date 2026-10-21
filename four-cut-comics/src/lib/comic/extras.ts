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

// v1.15: INSTA 포스팅 자동화(insta_auto_poster) 새 글 화면. 그 화면은 주소의 caption·hashtags(쉼표 구분)를 받아 미리 채운다.
export const INSTA_NEW_POST_URL = "https://auto-instagram-posting.buylife.xyz/posts/new";
const MAX_HANDOFF_URL = 6000;

// v1.16: INSTA 카드뉴스는 4장 고정이라 컷이 4개일 때만 컷별로 넘긴다.
export const INSTA_CARD_COUNT = 4;

/**
 * INSTA 새 글 화면 주소. 문구가 길어 주소가 너무 길어지면 문구는 빼고(복사본으로 붙여넣기) 화면만 연다.
 * 카드뉴스(v1.16)는 INSTA v1.28의 `postType=card_news`로 형식을 미리 고른다(문구를 빼도 형식은 유지).
 */
export function instaHandoffUrl(c: InstaCopy, base = INSTA_NEW_POST_URL, postType: "feed" | "card_news" = "feed"): { url: string; prefilled: boolean } {
  const type: Record<string, string> = postType === "card_news" ? { postType } : {};
  const full = `${base}?${new URLSearchParams({ ...type, caption: c.caption, hashtags: c.hashtags.join(",") })}`;
  if (full.length <= MAX_HANDOFF_URL) return { url: full, prefilled: true };
  const short = new URLSearchParams(type).toString();
  return { url: short ? `${base}?${short}` : base, prefilled: false };
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

/**
 * 웹툰형 세로 저장 배치(v1.06): 모바일 웹툰처럼 가로 width(기본 800px)에 맞추고, 컷 사이를 넓게(gap) 띄워
 * 스크롤 호흡을 주며 위·아래·좌우에 여백(pad)을 둔다. 결과 높이가 maxHeight를 넘으면 전체를 비율대로 줄인다.
 */
export function webtoonLayout(sizes: { w: number; h: number }[], o: { width?: number; gap?: number; pad?: number; maxHeight?: number } = {}): { width: number; height: number; rects: StackRect[] } {
  if (!sizes.length || sizes.some((s) => !(s.w > 0 && s.h > 0))) throw new Error("이미지 크기가 올바르지 않습니다.");
  let width = o.width ?? 800;
  let gap = o.gap ?? 96;
  let pad = o.pad ?? 48;
  const inner = width - pad * 2;
  let heights = sizes.map((s) => (s.h * inner) / s.w);
  let height = pad * 2 + heights.reduce((a, b) => a + b, 0) + gap * (sizes.length - 1);
  const maxHeight = o.maxHeight ?? 16000;
  let k = 1;
  if (height > maxHeight) { k = maxHeight / height; width *= k; gap *= k; pad *= k; heights = heights.map((h) => h * k); height = maxHeight; }
  const rects: StackRect[] = [];
  let y = pad;
  for (const h of heights) { rects.push({ x: Math.round(pad), y: Math.round(y), w: Math.round(inner * k), h: Math.round(h) }); y += h + gap; }
  return { width: Math.round(width), height: Math.round(height), rects };
}

/**
 * 컷 저장 배치(v1.07, 컷마다 비율이 달라도 동작). 바둑판은 열마다 같은 너비로 맞추고 행 높이는 그 행에서 가장 높은 컷,
 * 세로 연속은 같은 너비, 가로 연속은 같은 높이로 맞춘다. 모든 컷 크기가 같으면 v1.06과 같은 결과가 나온다.
 */
export function panelsLayout(sizes: { w: number; h: number }[], layout: "grid" | "horizontal" | "vertical"): { width: number; height: number; rects: StackRect[] } {
  if (!sizes.length || sizes.some((s) => !(s.w > 0 && s.h > 0))) throw new Error("이미지 크기가 올바르지 않습니다.");
  const n = sizes.length;
  if (layout === "horizontal") {
    const H = Math.max(...sizes.map((s) => s.h));
    const gap = Math.round(H * 0.02);
    const widths = sizes.map((s) => Math.round((s.w * H) / s.h));
    const rects: StackRect[] = [];
    let x = gap;
    for (const w of widths) { rects.push({ x, y: gap, w, h: H }); x += w + gap; }
    return { width: x, height: H + gap * 2, rects };
  }
  const W = Math.max(...sizes.map((s) => s.w));
  const gap = Math.round(W * 0.02);
  const cols = layout === "vertical" ? 1 : n === 3 ? 3 : 2;
  const scaled = sizes.map((s) => Math.round((s.h * W) / s.w));
  const rects: StackRect[] = [];
  let y = gap;
  for (let r = 0; r * cols < n; r++) {
    const row = scaled.slice(r * cols, r * cols + cols);
    const rowH = Math.max(...row);
    row.forEach((h, c) => rects.push({ x: gap + c * (W + gap), y: y + Math.round((rowH - h) / 2), w: W, h }));
    y += rowH + gap;
  }
  return { width: cols * W + (cols + 1) * gap, height: y, rects };
}

/**
 * 웹툰형 세로 이미지를 한 장당 maxHeight 이하로 나눌 구간(v1.07). 가능하면 컷 사이 여백 한가운데에서 자르고,
 * 한 컷이 maxHeight보다 길면 그 컷 안에서 자른다. 반환: [시작, 끝) 픽셀 구간 목록.
 */
export function splitRanges(rects: StackRect[], totalHeight: number, maxHeight: number): [number, number][] {
  if (!(maxHeight > 0) || totalHeight <= maxHeight) return [[0, totalHeight]];
  // 자르기 좋은 위치: 컷과 컷 사이 여백의 한가운데
  const cuts: number[] = [];
  for (let i = 0; i + 1 < rects.length; i++) {
    const end = rects[i].y + rects[i].h;
    const next = rects[i + 1].y;
    if (next > end) cuts.push(Math.round((end + next) / 2));
  }
  const out: [number, number][] = [];
  let start = 0;
  while (totalHeight - start > maxHeight) {
    const limit = start + maxHeight;
    const good = cuts.filter((c) => c > start + maxHeight * 0.3 && c <= limit);
    const end = good.length ? good[good.length - 1] : limit;
    out.push([start, end]);
    start = end;
  }
  out.push([start, totalHeight]);
  return out;
}

export const MAX_WORKS = 20;

export const WORK_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * 내 작품 목록: 만든 지 30일이 지난 것은 빼고(v1.24, D-58-01 — 이어서 만들기·열기도 이 목록만 씀),
 * 최신순으로 최대 max개만 남긴다. 뺀 항목의 id를 돌려준다(호출 쪽이 저장소에서 지움).
 */
export function trimWorks<T extends { id: string; createdAt: number }>(list: T[], max = MAX_WORKS, now: number = Date.now()): { keep: T[]; drop: string[] } {
  const expired = (w: T) => Number.isFinite(w.createdAt) && now - w.createdAt > WORK_RETENTION_MS;
  const live = list.filter((w) => !expired(w)).sort((a, b) => b.createdAt - a.createdAt);
  return { keep: live.slice(0, max), drop: [...list.filter(expired).map((w) => w.id), ...live.slice(max).map((w) => w.id)] };
}
