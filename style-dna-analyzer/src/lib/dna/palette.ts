// 이미지 색상 팔레트·색감 일치율 계산(순수 함수 — 서버(sharp 원시 픽셀)와 브라우저(canvas) 양쪽에서 쓴다).
// 입력은 R,G,B,A 순서로 늘어선 픽셀 배열이다.
import type { PaletteColor } from "./types";

const hex2 = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
const toHex = (r: number, g: number, b: number) => `#${hex2(r)}${hex2(g)}${hex2(b)}`.toUpperCase();

interface Bin {
  count: number;
  r: number;
  g: number;
  b: number;
}

/** 주요 색 N개와 비중(합계 100). 밝기가 비슷한 색은 한 색으로 합친다. */
export function paletteFromRgba(data: ArrayLike<number>, count = 5): PaletteColor[] {
  const bins = new Map<number, Bin>();
  let total = 0;
  for (let i = 0; i + 3 < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const bin = bins.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
    bin.count++;
    bin.r += r;
    bin.g += g;
    bin.b += b;
    bins.set(key, bin);
    total++;
  }
  if (!total) return [];

  const sorted = Array.from(bins.values())
    .map((b) => ({ ...b, ar: b.r / b.count, ag: b.g / b.count, ab: b.b / b.count }))
    .sort((a, b) => b.count - a.count);

  const dist = (a: { ar: number; ag: number; ab: number }, b: { ar: number; ag: number; ab: number }) =>
    Math.hypot(a.ar - b.ar, a.ag - b.ag, a.ab - b.ab);

  const centers: typeof sorted = [];
  for (const bin of sorted) {
    if (centers.every((c) => dist(c, bin) >= 60)) centers.push(bin);
    if (centers.length >= count) break;
  }

  // 모든 색을 가장 가까운 대표색에 배정해 비중과 평균색을 낸다.
  const groups = centers.map(() => ({ count: 0, r: 0, g: 0, b: 0 }));
  for (const bin of sorted) {
    let best = 0;
    let bestD = Infinity;
    centers.forEach((c, i) => {
      const d = dist(c, bin);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    const g = groups[best];
    g.count += bin.count;
    g.r += bin.r;
    g.g += bin.g;
    g.b += bin.b;
  }

  const colors = groups
    .filter((g) => g.count > 0)
    .map((g) => ({ hex: toHex(g.r / g.count, g.g / g.count, g.b / g.count), share: g.count / total }))
    .sort((a, b) => b.share - a.share);

  const out = colors.map((c) => ({ hex: c.hex, percent: Math.round(c.share * 100) }));
  // 반올림 오차를 가장 큰 색에 맞춰 합계를 100으로 만든다.
  const diff = 100 - out.reduce((s, c) => s + c.percent, 0);
  if (out.length) out[0].percent += diff;
  return out.filter((c) => c.percent > 0);
}

/** 색 분포(채널당 3비트 히스토그램)가 얼마나 겹치는지 0~100(소수 첫째 자리). 구도·형태는 비교하지 않는 색감 비교다. */
export function histogramSimilarity(a: ArrayLike<number>, b: ArrayLike<number>): number {
  const hist = (data: ArrayLike<number>) => {
    const h = new Float64Array(512);
    let n = 0;
    for (let i = 0; i + 3 < data.length; i += 4) {
      if (data[i + 3] < 128) continue;
      h[((data[i] >> 5) << 6) | ((data[i + 1] >> 5) << 3) | (data[i + 2] >> 5)]++;
      n++;
    }
    return { h, n };
  };
  const ha = hist(a);
  const hb = hist(b);
  if (!ha.n || !hb.n) return 0;
  let overlap = 0;
  for (let i = 0; i < 512; i++) overlap += Math.min(ha.h[i] / ha.n, hb.h[i] / hb.n);
  return Math.round(overlap * 1000) / 10;
}
