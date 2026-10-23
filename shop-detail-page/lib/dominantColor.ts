/**
 * v1.26: 점들의 색 가운데 「가장 많이 나온 색」을 #rrggbb로 돌려준다(문구 고치기의 덮는 색).
 * 평균을 내면 회색 배경과 녹색 배지가 섞인 탁한 중간색이 나오므로, 비슷한 색(채널당 16단계)끼리 묶어
 * 가장 큰 묶음의 평균을 쓴다. 점이 없으면 흰색.
 */
export function dominantColor(pixels: ReadonlyArray<readonly [number, number, number]>): string {
  const groups = new Map<number, { n: number; r: number; g: number; b: number }>();
  let best: { n: number; r: number; g: number; b: number } | null = null;
  for (const [r, g, b] of pixels) {
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const grp = groups.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    grp.n++;
    grp.r += r;
    grp.g += g;
    grp.b += b;
    groups.set(key, grp);
    if (!best || grp.n > best.n) best = grp;
  }
  if (!best) return "#ffffff";
  const { n, r, g, b } = best;
  const hex = (v: number) => Math.round(v / n).toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}
