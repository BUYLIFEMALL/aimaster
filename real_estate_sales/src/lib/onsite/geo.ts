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

// ── 주소 자동 등록(2026-11-02): 행정안전부 위치정보요약DB(도로명주소 건물마다 대표 출입구 1곳)를 약 1km 격자 파일로 나눠 둔다.
// 칸: [위도×1e5, 경도×1e5, 시도, 시군구, 법정동(읍면동), 도로명, 지하(0/1), 본번, 부번, 건물명, 건물용도, 관할행정동, PNU, 공동주택("1"/"")]
// PNU·공동주택은 v2 격자부터 있다(도로명주소 한글 전체분과 연결, 못 찾으면 "").
export type AddressRow = [lat5: number, lon5: number, sido: string, sgg: string, emd: string, road: string, under: string, main: string, sub: string, building: string, use: string, adminDong: string, pnu?: string, apartment?: string];
export type AddressHit = { address: string; building: string; use: string; distanceM: number; pnu: string | null; jibun: string | null; apartment: boolean };

export const ADDRESS_TILE_STEP = 0.01;
export const AUTO_ADDRESS_MAX_M = 30; // 이보다 멀면 자동으로 넣지 않고 「근처」로 보여 준다(큰 건물 앞 표시 오차 수십 m, 2026-11-01 현장 시험)
const SEARCH_MAX_M = 150;
const EDGE = 0.0015; // 격자 가장자리 약 150m 안이면 옆 격자도 본다

/** UTM-K(EPSG:5179, GRS80) → 위경도. 중앙자오선 127.5·원점위도 38·k0 0.9996·가산 1,000,000/2,000,000 (Snyder 역변환) */
export function utmkToWgs(x: number, y: number): [lat: number, lon: number] {
  const a = 6378137, f = 1 / 298.257222101, e2 = f * (2 - f), ep2 = e2 / (1 - e2), k0 = 0.9996;
  const lat0 = (38 * Math.PI) / 180, lon0 = (127.5 * Math.PI) / 180;
  const meridian = (p: number) => a * ((1 - e2 / 4 - (3 * e2 ** 2) / 64 - (5 * e2 ** 3) / 256) * p - ((3 * e2) / 8 + (3 * e2 ** 2) / 32 + (45 * e2 ** 3) / 1024) * Math.sin(2 * p) + ((15 * e2 ** 2) / 256 + (45 * e2 ** 3) / 1024) * Math.sin(4 * p) - ((35 * e2 ** 3) / 3072) * Math.sin(6 * p));
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const mu = (meridian(lat0) + (y - 2e6) / k0) / (a * (1 - e2 / 4 - (3 * e2 ** 2) / 64 - (5 * e2 ** 3) / 256));
  const p1 = mu + ((3 * e1) / 2 - (27 * e1 ** 3) / 32) * Math.sin(2 * mu) + ((21 * e1 ** 2) / 16 - (55 * e1 ** 4) / 32) * Math.sin(4 * mu) + ((151 * e1 ** 3) / 96) * Math.sin(6 * mu) + ((1097 * e1 ** 4) / 512) * Math.sin(8 * mu);
  const C1 = ep2 * Math.cos(p1) ** 2, T1 = Math.tan(p1) ** 2, s2 = 1 - e2 * Math.sin(p1) ** 2;
  const N1 = a / Math.sqrt(s2), R1 = (a * (1 - e2)) / s2 ** 1.5, D = (x - 1e6) / (N1 * k0);
  const lat = p1 - ((N1 * Math.tan(p1)) / R1) * (D ** 2 / 2 - ((5 + 3 * T1 + 10 * C1 - 4 * C1 ** 2 - 9 * ep2) * D ** 4) / 24 + ((61 + 90 * T1 + 298 * C1 + 45 * T1 ** 2 - 252 * ep2 - 3 * C1 ** 2) * D ** 6) / 720);
  const lon = lon0 + (D - ((1 + 2 * T1 + C1) * D ** 3) / 6 + ((5 - 2 * C1 + 28 * T1 - 3 * C1 ** 2 + 8 * ep2 + 24 * T1 ** 2) * D ** 5) / 120) / Math.cos(p1);
  return [(lat * 180) / Math.PI, (lon * 180) / Math.PI];
}

export const tileKey = (lat: number, lon: number) => `${Math.floor(lat / ADDRESS_TILE_STEP)}_${Math.floor(lon / ADDRESS_TILE_STEP)}`;

/** 이 위치를 찾으려면 받아야 할 격자들. 가장자리 가까이면 옆 격자까지 */
export function tilesFor(lat: number, lon: number): string[] {
  const keys = new Set<string>();
  for (const dLat of [-EDGE, 0, EDGE]) for (const dLon of [-EDGE, 0, EDGE]) keys.add(tileKey(lat + dLat, lon + dLon));
  return [...keys];
}

export function distanceM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = Math.PI / 180;
  const x = (lon2 - lon1) * rad * Math.cos(((lat1 + lat2) / 2) * rad);
  return Math.sqrt(x ** 2 + ((lat2 - lat1) * rad) ** 2) * 6371000;
}

/** 도로명주소 표기: 「서울특별시 종로구 자하문로 96 (청운동, 평안빌)」 */
export function formatAddress(r: AddressRow): string {
  const [, , sido, sgg, emd, road, under, main, sub, building] = r;
  const no = `${under === "1" ? "지하 " : ""}${main}${sub && sub !== "0" ? `-${sub}` : ""}`;
  const note = [emd, building].filter(Boolean).join(", ");
  return `${[sido, sgg, road, no].filter(Boolean).join(" ")}${note ? ` (${note})` : ""}`;
}

/** 30m 안 건물이면 저장할 주소·지번. 멀면 모두 null(회원이 「위치로 주소 찾기」로 확인) */
export function autoParcel(hit: AddressHit | null): { address: string | null; pnu: string | null; jibun: string | null } {
  if (!hit || hit.distanceM > AUTO_ADDRESS_MAX_M) return { address: null, pnu: null, jibun: null };
  return { address: hit.address, pnu: hit.pnu, jibun: hit.jibun };
}

/** 지번 표기: PNU 1111010100 1 0144 0003 → 「서울특별시 종로구 청운동 144-3」(산이면 「산 12」) */
export function formatJibun(r: AddressRow): string | null {
  const pnu = r[12];
  if (!pnu || !/^\d{19}$/.test(pnu)) return null;
  const main = Number(pnu.slice(11, 15)), sub = Number(pnu.slice(15, 19));
  const no = `${pnu[10] === "2" ? "산 " : ""}${main}${sub ? `-${sub}` : ""}`;
  return [r[2], r[3], r[4], no].filter(Boolean).join(" ");
}

/** 가장 가까운 건물. 150m 안에 없으면 null */
export function nearestAddress(rows: AddressRow[], lat: number, lon: number): AddressHit | null {
  let best: AddressRow | null = null;
  let bestM = Infinity;
  for (const r of rows) {
    const m = distanceM(lat, lon, r[0] / 1e5, r[1] / 1e5);
    if (m < bestM) [best, bestM] = [r, m];
  }
  if (!best || bestM > SEARCH_MAX_M) return null;
  const jibun = formatJibun(best);
  return { address: formatAddress(best), building: best[9], use: best[10], distanceM: Math.round(bestM), pnu: jibun ? best[12]! : null, jibun, apartment: best[13] === "1" };
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
