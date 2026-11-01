// 매물 좌표가 어느 행정동 경계 안인지 판정한다. 회원 브라우저 안에서만 돌며 좌표를 서버로 보내지 않는다. 순수 함수만 둔다(시험 대상).
export type Ring = [lon: number, lat: number][];
export type DongBoundary = [name: string, polygons: Ring[][]];

export const UNKNOWN_DONG = "판정 불가";

function inRing(x: number, y: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** 한 곳에만 들어가면 그 행정동, 없거나 여러 곳이면 판정 불가 */
export function locateDong(boundaries: DongBoundary[], lat: number, lon: number): string {
  const hits = boundaries.filter(([, polys]) => polys.some((p) => inRing(lon, lat, p[0]) && !p.slice(1).some((h) => inRing(lon, lat, h))));
  return hits.length === 1 ? hits[0][0] : UNKNOWN_DONG;
}

export function articleNoOf(url: unknown): string {
  try {
    return new URL(String(url)).searchParams.get("articleNo") ?? "";
  } catch {
    return "";
  }
}
