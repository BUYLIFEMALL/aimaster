// v1.09 자르기 막대 끌기 — 손잡이 위치(막대 안 비율 0~1)를 앞·뒤 자르기 초로 바꾼다(순수 함수, 화면·시험 공용).
// 남는 구간은 최소 MIN_CLIP_S(0.5초)를 지키고, 0.1초 단위로 맞춘다.
import { MIN_CLIP_S } from "./timeline";

export type TrimEdge = "start" | "end";

const round1 = (n: number) => Math.round(n * 10) / 10;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** ratio: 막대 왼쪽 끝 0 ~ 오른쪽 끝 1. 끈 쪽의 자르기 값만 바꾸고 반대쪽은 그대로 둔다 */
export function trimFromRatio(duration: number, trimStart: number, trimEnd: number, edge: TrimEdge, ratio: number): { trimStart: number; trimEnd: number } {
  const d = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const s = clamp(Number(trimStart) || 0, 0, d);
  const e = clamp(Number(trimEnd) || 0, 0, d);
  if (d <= MIN_CLIP_S) return { trimStart: 0, trimEnd: 0 };
  const at = round1(clamp(Number.isFinite(ratio) ? ratio : 0, 0, 1) * d);
  if (edge === "start") return { trimStart: round1(clamp(at, 0, d - e - MIN_CLIP_S)), trimEnd: e };
  return { trimStart: s, trimEnd: round1(clamp(d - at, 0, d - s - MIN_CLIP_S)) };
}

/** 키보드(←→)로 0.1초씩 — 손잡이를 오른쪽(+1)·왼쪽(-1)으로 옮긴다 */
export function nudgeTrim(duration: number, trimStart: number, trimEnd: number, edge: TrimEdge, dir: 1 | -1): { trimStart: number; trimEnd: number } {
  const d = Number.isFinite(duration) && duration > 0 ? duration : 0;
  if (!d) return { trimStart: 0, trimEnd: 0 };
  const pos = edge === "start" ? (Number(trimStart) || 0) + dir * 0.1 : d - (Number(trimEnd) || 0) + dir * 0.1;
  return trimFromRatio(d, trimStart, trimEnd, edge, pos / d);
}
