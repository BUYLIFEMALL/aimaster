// v1.15 인스타 자동 포스팅 1차 — 웹툰 컷을 인스타 캐러셀 장(4:5)으로 만드는 순수 함수(자동 검사용).
// 「1컷 = 1장」: 흰 1080×1350 판에 컷 그림 전체를 넣고 아래에 대사 말풍선(원고 「전체 이어붙여 저장」과 같은 모양). 플랜: docs/PLAN_20261020_INSTA_AUTOPOST.md
import type { WebtoonProject } from "../types";

export const MAX_INSTA_PHOTOS = 10;
export const MAX_INSTA_CAPTION = 2200;
export const SLIDE_W = 1080;
export const SLIDE_H = 1350;
export const SLIDE_PAD = 48;
export const LINE_H = 44;
export const MAX_DIALOGUE_LINES = 3;
const BUBBLE_PAD_Y = 22;
const BUBBLE_GAP = 32;

export interface SlideSource {
  id: string;
  label: string;
  src: string;
  dialogue: string;
}

/** 표지(넣기로 했고 그림이 있으면) + 그림이 있는 컷을 원고 순서대로 */
export function slideSources(project: Pick<WebtoonProject, "includeCover" | "coverImageUrl" | "cuts">): SlideSource[] {
  const list: SlideSource[] = [];
  if (project.includeCover && project.coverImageUrl) list.push({ id: "cover", label: "표지", src: project.coverImageUrl, dialogue: "" });
  for (const c of project.cuts ?? []) {
    if (c.imageUrl) list.push({ id: `cut-${c.cutIndex}`, label: `${c.cutIndex}컷`, src: c.imageUrl, dialogue: (c.dialogue ?? "").trim() });
  }
  return list;
}

/** 처음엔 앞에서부터 최대 10장을 고른다 */
export function defaultPicked(sources: SlideSource[]): string[] {
  return sources.slice(0, MAX_INSTA_PHOTOS).map((s) => s.id);
}

/** 넣기/빼기(순서는 항상 원고 순서, 10장 넘게는 안 담김) */
export function togglePicked(sources: SlideSource[], picked: string[], id: string): string[] {
  const set = new Set(picked);
  if (set.has(id)) set.delete(id);
  else if (set.size < MAX_INSTA_PHOTOS) set.add(id);
  return sources.filter((s) => set.has(s.id)).map((s) => s.id);
}

/** 대사를 판 너비에 맞춰 줄바꿈(글자 단위, 공백에서 끊기를 우선). 최대 3줄, 넘치면 마지막 줄 끝을 「…」 */
export function wrapDialogue(text: string, maxWidth: number, measure: (s: string) => number, maxLines = MAX_DIALOGUE_LINES): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const lines: string[] = [];
  let rest = clean;
  while (rest && lines.length < maxLines) {
    if (measure(rest) <= maxWidth) { lines.push(rest); rest = ""; break; }
    let cut = 1;
    while (cut < rest.length && measure(rest.slice(0, cut + 1)) <= maxWidth) cut++;
    const space = rest.lastIndexOf(" ", cut);
    if (space > cut * 0.6) cut = space;
    lines.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) {
    let last = lines[lines.length - 1];
    while (last.length > 1 && measure(`${last}…`) > maxWidth) last = last.slice(0, -1);
    lines[lines.length - 1] = `${last}…`;
  }
  return lines;
}

export interface SlideLayout {
  dx: number; dy: number; dw: number; dh: number;
  /** 말풍선 상자(대사가 없으면 null) */
  bubble: { x: number; y: number; w: number; h: number } | null;
}

/** 판 안 배치: 컷 그림을 비율 그대로 최대한 크게, 대사가 있으면 아래에 말풍선. 그림+말풍선 묶음은 세로 가운데 */
export function slideLayout(imgW: number, imgH: number, lineCount: number, bubbleTextWidth = 0): SlideLayout {
  const bubbleH = lineCount > 0 ? lineCount * LINE_H + BUBBLE_PAD_Y * 2 : 0;
  const boxW = SLIDE_W - SLIDE_PAD * 2;
  const boxH = SLIDE_H - SLIDE_PAD * 2 - (bubbleH ? bubbleH + BUBBLE_GAP : 0);
  const scale = Math.min(boxW / imgW, boxH / imgH);
  const dw = Math.round(imgW * scale);
  const dh = Math.round(imgH * scale);
  const total = dh + (bubbleH ? BUBBLE_GAP + bubbleH : 0);
  const dy = Math.round((SLIDE_H - total) / 2);
  const dx = Math.round((SLIDE_W - dw) / 2);
  if (!bubbleH) return { dx, dy, dw, dh, bubble: null };
  const w = Math.min(boxW, Math.max(240, Math.round(bubbleTextWidth) + 64));
  return { dx, dy, dw, dh, bubble: { x: Math.round((SLIDE_W - w) / 2), y: dy + dh + BUBBLE_GAP, w, h: bubbleH } };
}

/** 기본 캡션: 제목 + 줄거리 + 해시태그(회원이 고칠 수 있음) */
export function defaultCaption(title: string, synopsis: string): string {
  const parts = [title.trim(), synopsis.trim(), "#웹툰 #AI웹툰 #인스타툰 #웹툰추천"].filter(Boolean);
  return parts.join("\n\n").slice(0, MAX_INSTA_CAPTION);
}

/** 임시 경로는 회원 본인 webtoon-insta 폴더의 .jpg 1~10장만 */
export function validInstaPaths(userId: string, paths: string[]): boolean {
  const prefix = `${userId}/webtoon-insta/`;
  return paths.length >= 1 && paths.length <= MAX_INSTA_PHOTOS && paths.every((p) => p.startsWith(prefix) && !p.includes("..") && /\.jpg$/.test(p));
}

// ── v1.17 회차 묶음 예약 ─────────────────────────────────────────────
/** 한 번에 예약할 수 있는 회차 수(서버의 회원별 대기 예약 한도 20건과 같음) */
export const MAX_BATCH_EPISODES = 20;

export interface Episode {
  fileName: string;
  title: string;
  synopsis: string;
  sources: SlideSource[];
}

/** 「프로젝트 저장(JSON)」 파일 내용 → 회차. 웹툰 프로젝트가 아니면 null */
export function parseEpisode(fileName: string, text: string): Episode | null {
  let data: unknown;
  try { data = JSON.parse(text); } catch { return null; }
  if (!data || typeof data !== "object") return null;
  const p = data as Partial<WebtoonProject>;
  if (!Array.isArray(p.cuts) && typeof p.title !== "string") return null;
  const sources = slideSources({ includeCover: p.includeCover ?? true, coverImageUrl: typeof p.coverImageUrl === "string" ? p.coverImageUrl : undefined, cuts: Array.isArray(p.cuts) ? p.cuts : [] });
  return { fileName, title: (p.title ?? "").trim() || fileName.replace(/\.json$/i, ""), synopsis: (p.synopsis ?? "").trim(), sources };
}

/** 파일 이름의 숫자 순서대로(1화, 2화, … 10화) */
export function sortEpisodes(list: Episode[]): Episode[] {
  return [...list].sort((a, b) => a.fileName.localeCompare(b.fileName, "ko", { numeric: true }));
}

/** 첫 회차 시각(한국 시간 「YYYY-MM-DDTHH:mm」)부터 interval일 간격으로 count개 시각(같은 형식) */
export function episodeTimes(firstLocal: string, count: number, intervalDays: number): string[] {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(firstLocal);
  if (!m || count < 1 || intervalDays < 1) return [];
  const base = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  return Array.from({ length: count }, (_, i) => new Date(base + i * intervalDays * 86400000).toISOString().slice(0, 16));
}
