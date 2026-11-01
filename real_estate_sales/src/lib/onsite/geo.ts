// 임장 노트의 위치 계산. 순수 함수만 둔다(시험 대상). 행정동 판정은 commercial-land-trade-alert/src/lib/adminDongGeo.ts와 같은 방식이다.
export type Ring = [lon: number, lat: number][];
export type DongBoundary = [name: string, polygons: Ring[][]];
export type SggBox = [sggCd: string, minLon: number, minLat: number, maxLon: number, maxLat: number];
export type GeoSample = { lat: number; lon: number; accuracy: number };

const GOOD_ACCURACY_M = 25;
const MAX_WAIT_MS = 20000;

function inRing(x: number, y: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** 한 곳에만 들어가면 그 행정동, 없거나 여러 곳이면 null */
export function locateDong(boundaries: DongBoundary[], lat: number, lon: number): string | null {
  const hits = boundaries.filter(([, polys]) => polys.some((p) => inRing(lon, lat, p[0]) && !p.slice(1).some((h) => inRing(lon, lat, h))));
  return hits.length === 1 ? hits[0][0] : null;
}

export function sggCandidates(index: SggBox[], lat: number, lon: number): string[] {
  return index.filter(([, minLon, minLat, maxLon, maxLat]) => lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat).map(([sgg]) => sgg);
}

export function bestSample(samples: GeoSample[]): GeoSample | null {
  return samples.reduce<GeoSample | null>((best, s) => (!best || s.accuracy < best.accuracy ? s : best), null);
}

/** 첫 측정값은 오차가 커서(사전 검증 100m) 좋아질 때까지 기다리고, 정해진 시간이 지나면 그때까지 가장 좋은 값을 쓴다 */
export function shouldStopWaiting(samples: GeoSample[], elapsedMs: number): boolean {
  const best = bestSample(samples);
  return (best !== null && best.accuracy <= GOOD_ACCURACY_M) || elapsedMs >= MAX_WAIT_MS;
}

export function fitSize(width: number, height: number, longSide = 1600): { width: number; height: number } {
  const scale = Math.min(1, longSide / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

function readTiffGps(buf: ArrayBuffer, start: number): { lat: number; lon: number } | null {
  const view = new DataView(buf);
  const little = view.getUint16(start) === 0x4949;
  const u16 = (p: number) => view.getUint16(p, little);
  const u32 = (p: number) => view.getUint32(p, little);
  const ifd = start + u32(start + 4);
  let gpsIfd: number | null = null;
  for (let i = 0, n = u16(ifd); i < n; i++) {
    const entry = ifd + 2 + i * 12;
    if (u16(entry) === 0x8825) gpsIfd = start + u32(entry + 8);
  }
  if (gpsIfd === null) return null;
  const degrees = (p: number) => {
    const at = start + u32(p);
    const part = (k: number) => u32(at + k * 8) / u32(at + k * 8 + 4);
    return part(0) + part(1) / 60 + part(2) / 3600;
  };
  let lat = 0;
  let lon = 0;
  let latRef = "N";
  let lonRef = "E";
  for (let i = 0, n = u16(gpsIfd); i < n; i++) {
    const entry = gpsIfd + 2 + i * 12;
    const tag = u16(entry);
    if (tag === 1) latRef = String.fromCharCode(view.getUint8(entry + 8));
    if (tag === 2) lat = degrees(entry + 8);
    if (tag === 3) lonRef = String.fromCharCode(view.getUint8(entry + 8));
    if (tag === 4) lon = degrees(entry + 8);
  }
  if (!(lat > 0 && lon > 0)) return null;
  return { lat: latRef === "S" ? -lat : lat, lon: lonRef === "W" ? -lon : lon };
}

/** 사진 속 위치 정보. 브라우저에 따라 지워져 있어 없을 수 있다(사전 검증: 크롬 없음) */
export function exifGps(buf: ArrayBuffer): { lat: number; lon: number } | null {
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length - 10; i++) {
    if (bytes[i] === 0x45 && bytes[i + 1] === 0x78 && bytes[i + 2] === 0x69 && bytes[i + 3] === 0x66 && bytes[i + 4] === 0 && bytes[i + 5] === 0) {
      try {
        return readTiffGps(buf, i + 6);
      } catch {
        return null;
      }
    }
  }
  return null;
}
