import { ALLOWED_ASPECT_RATIOS, type AspectRatio } from "./types";

/** 사진 가로·세로 → Gemini가 지원하는 종횡비 중 가장 가까운 것 */
export function bestAspectRatio(width: number, height: number): AspectRatio {
  if (!(width > 0) || !(height > 0)) return "1:1";
  const r = width / height;
  const candidates: { id: AspectRatio; v: number }[] = [
    { id: "9:16", v: 9 / 16 }, { id: "3:4", v: 3 / 4 }, { id: "1:1", v: 1 }, { id: "4:3", v: 4 / 3 }, { id: "16:9", v: 16 / 9 },
  ];
  let best = candidates[0];
  for (const c of candidates) if (Math.abs(Math.log(r / c.v)) < Math.abs(Math.log(r / best.v))) best = c;
  return best.id;
}

export function isAspectRatio(v: unknown): v is AspectRatio {
  return typeof v === "string" && (ALLOWED_ASPECT_RATIOS as readonly string[]).includes(v);
}

/** 긴 변이 maxSide를 넘으면 비율을 유지해 줄인다 */
export function fitWithin(width: number, height: number, maxSide: number): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxSide) return { width: Math.round(width), height: Math.round(height) };
  const s = maxSide / longest;
  return { width: Math.max(1, Math.round(width * s)), height: Math.max(1, Math.round(height * s)) };
}
