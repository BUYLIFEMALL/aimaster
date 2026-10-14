import { NO_SPEAKER, THOUGHT_SPEAKER } from "./options";
import type { Panel } from "./script";

// 말풍선 데이터와 순수 계산(서버·클라이언트 공용, 테스트 대상).
// 좌표는 컷 그림 크기와 무관하게 0~1000으로 정규화한다(그릴 때 실제 픽셀로 바꾼다).

export type BalloonShape = "speech" | "thought" | "shout";
export const BALLOON_SHAPES: { id: BalloonShape; name: string }[] = [
  { id: "speech", name: "말풍선" },
  { id: "thought", name: "생각" },
  { id: "shout", name: "외침" },
];
export const BALLOON_COLORS = ["#222222", "#F97316", "#2563EB", "#DC2626", "#16A34A", "#7C3AED"] as const;

export interface Balloon {
  x: number; y: number; w: number; h: number; // 상자(왼쪽 위·너비·높이)
  tail: { x: number; y: number } | null; // 꼬리 끝(화자 입 쪽). null이면 꼬리 없음
  shape: BalloonShape;
  rotation: number; // 도(-30~30)
  color: string; // 테두리 색(BALLOON_COLORS 중 하나)
}

export const SCALE = 1000;
export const MIN_W = 160;
export const MIN_H = 110;
export const MAX_ROTATION = 30;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const num = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
const isShape = (v: unknown): v is BalloonShape => BALLOON_SHAPES.some((s) => s.id === v);

/** 대사 성격에 맞는 기본 모양: 생각 → 생각풍선, 느낌표가 두 개 이상이면 외침 */
export function shapeFor(panel: Pick<Panel, "character" | "dialogue">): BalloonShape {
  if (panel.character === THOUGHT_SPEAKER) return "thought";
  return (panel.dialogue.match(/!/g) ?? []).length >= 2 ? "shout" : "speech";
}

/** AI가 실패했거나 직접 배치를 처음 열 때 쓰는 기본 위치: 컷 상단 중앙 */
export function defaultBalloon(panel: Pick<Panel, "character" | "dialogue">): Balloon {
  const narration = panel.character === NO_SPEAKER;
  return { x: 150, y: 40, w: 700, h: 230, tail: narration ? null : { x: 500, y: 420 }, shape: shapeFor(panel), rotation: 0, color: BALLOON_COLORS[0] };
}

/** 임의 값(AI 응답·편집 결과)을 그릴 수 있는 말풍선으로 고친다. 상자는 컷 안에 들어오게 자르고 최소 크기를 보장한다. */
export function normalizeBalloon(raw: unknown, fallback: Balloon): Balloon {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const w = clamp(Math.round(num(o.w, fallback.w)), MIN_W, SCALE);
  const h = clamp(Math.round(num(o.h, fallback.h)), MIN_H, SCALE);
  const x = clamp(Math.round(num(o.x, fallback.x)), 0, SCALE - w);
  const y = clamp(Math.round(num(o.y, fallback.y)), 0, SCALE - h);
  let tail: Balloon["tail"] = fallback.tail;
  if (o.tail === null) tail = null;
  else if (o.tail && typeof o.tail === "object") {
    const t = o.tail as Record<string, unknown>;
    tail = { x: clamp(Math.round(num(t.x, x + w / 2)), 0, SCALE), y: clamp(Math.round(num(t.y, y + h)), 0, SCALE) };
  }
  const rotation = clamp(Math.round(num(o.rotation, fallback.rotation)), -MAX_ROTATION, MAX_ROTATION);
  const shape = isShape(o.shape) ? o.shape : fallback.shape;
  const color = typeof o.color === "string" && (BALLOON_COLORS as readonly string[]).includes(o.color) ? o.color : fallback.color;
  return { x, y, w, h, tail, shape, rotation, color };
}

/**
 * AI 응답 JSON 해석. 형식: {"box":{"x","y","w","h"},"tail":{"x","y"}|null,"shape":"speech|thought|shout"} (0~1000).
 * 상자가 없거나 숫자가 아니면 null(호출자가 기본 위치를 쓴다). 꼬리 끝이 상자 안이면 꼬리를 상자 아래로 뺀다.
 */
export function parseBalloonAi(raw: unknown, panel: Pick<Panel, "character" | "dialogue">): Balloon | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const box = (r.box ?? r) as Record<string, unknown>;
  if (!["x", "y", "w", "h"].every((k) => typeof box[k] === "number" && Number.isFinite(box[k] as number))) return null;
  const base = defaultBalloon(panel);
  const b = normalizeBalloon({ ...box, tail: panel.character === NO_SPEAKER ? null : r.tail ?? base.tail, shape: r.shape, rotation: 0 }, base);
  if (b.tail && b.tail.x > b.x && b.tail.x < b.x + b.w && b.tail.y > b.y && b.tail.y < b.y + b.h) {
    b.tail = { x: b.tail.x, y: clamp(b.y + b.h + 80, 0, SCALE) };
  }
  return shortenTail(b);
}

export const MAX_TAIL = 110;

/**
 * AI가 준 꼬리 끝(화자 입)까지 그대로 그리면 꼬리가 얼굴을 가로지른다. 방향은 유지하고,
 * 말풍선 테두리 바깥으로 남은 거리의 50%(최대 MAX_TAIL)만 뻗게 해 화자 앞에서 멈추게 한다.
 */
export function shortenTail(b: Balloon): Balloon {
  if (!b.tail) return b;
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const dx = b.tail.x - cx;
  const dy = b.tail.y - cy;
  const d = Math.hypot(dx, dy);
  if (d < 1) return b;
  const ux = dx / d;
  const uy = dy / d;
  const edge = 1 / Math.hypot(ux / (b.w / 2), uy / (b.h / 2));
  if (d <= edge) return b;
  const len = edge + Math.min((d - edge) * 0.5, MAX_TAIL);
  return { ...b, tail: { x: clamp(Math.round(cx + ux * len), 0, SCALE), y: clamp(Math.round(cy + uy * len), 0, SCALE) } };
}

/** 모양별로 글자를 넣을 수 있는 안쪽 상자 비율(타원 안에 들어가는 사각형) */
export function textAreaRatio(shape: BalloonShape): number {
  return shape === "shout" ? 0.6 : 0.7;
}

/**
 * 상자 안에 들어가는 가장 큰 글자 크기와 줄바꿈 결과. measure(px, text)는 해당 글자 크기에서의 너비.
 * 가장 작은 크기에서도 넘치면 그 크기로 돌려준다(overflow=true).
 */
export function fitText(
  measure: (px: number, text: string) => number,
  wrap: (px: number, text: string, maxWidth: number) => string[],
  text: string, boxW: number, boxH: number, maxPx: number, minPx: number, lineHeight = 1.25,
): { px: number; lines: string[]; overflow: boolean } {
  for (let px = Math.floor(maxPx); px >= minPx; px--) {
    const lines = wrap(px, text, boxW);
    if (lines.length * px * lineHeight <= boxH && lines.every((l) => measure(px, l) <= boxW)) return { px, lines, overflow: false };
  }
  const px = Math.ceil(minPx);
  return { px, lines: wrap(px, text, boxW), overflow: true };
}

/** 회전된 좌표계 변환: 점 p를 중심 c 기준으로 deg만큼 돌린다 */
export function rotatePoint(p: { x: number; y: number }, c: { x: number; y: number }, deg: number): { x: number; y: number } {
  const r = (deg * Math.PI) / 180;
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  return { x: c.x + dx * Math.cos(r) - dy * Math.sin(r), y: c.y + dx * Math.sin(r) + dy * Math.cos(r) };
}

/** 편집 동작 적용(픽셀이 아니라 0~1000 단위의 이동량). 결과는 항상 normalizeBalloon을 거친다. */
export function applyDrag(b: Balloon, mode: "move" | "resize" | "tail", dx: number, dy: number): Balloon {
  if (mode === "move") {
    const nx = clamp(b.x + dx, 0, SCALE - b.w);
    const ny = clamp(b.y + dy, 0, SCALE - b.h);
    const mx = nx - b.x;
    const my = ny - b.y;
    return normalizeBalloon({ ...b, x: nx, y: ny, tail: b.tail ? { x: b.tail.x + mx, y: b.tail.y + my } : null }, b);
  }
  if (mode === "resize") return normalizeBalloon({ ...b, w: clamp(b.w + dx, MIN_W, SCALE - b.x), h: clamp(b.h + dy, MIN_H, SCALE - b.y) }, b);
  if (!b.tail) return b;
  return normalizeBalloon({ ...b, tail: { x: b.tail.x + dx, y: b.tail.y + dy } }, b);
}
