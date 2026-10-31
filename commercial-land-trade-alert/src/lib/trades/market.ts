// 호가와 비교할 실거래 시세. 순수 함수만 둔다(시험 대상).
// 면적 기준: 상가 전용 ↔ 집합 건물, 건물 연면적 ↔ 일반 건물, 토지 ↔ 거래면적. 지분·취소는 값이 왜곡되어 뺀다.

function medianOrNull(values: number[]): number | null {
  if (values.length < 5) return null;
  const s = [...values].sort((x, y) => x - y);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export interface MarketRow {
  kind: string;
  building_type: string | null;
  category: string;
  umd_nm: string;
  price_per_pyeong: number | string | null;
  is_share: boolean;
  cancelled: boolean;
}

const SHOP_USES = ["제1종근린생활", "제2종근린생활", "판매"];
const LAND_SKIP = ["도로", "구거", "하천", "제방", "유지"];

function belongs(code: string, r: MarketRow): boolean {
  if (code === "SG") return r.kind === "building" && r.building_type === "집합" && SHOP_USES.includes(r.category);
  if (code === "GM") return r.kind === "building" && r.building_type === "일반" && r.category !== "숙박";
  if (code === "TJ") return r.kind === "land" && !LAND_SKIP.includes(r.category);
  return false;
}

export interface MarketValue {
  median: number;
  count: number;
  scope: "동" | "시군구";
}

/** 같은 동에 5건 이상이면 동 중간값, 모자라면 같은 시군구 중간값. 그래도 모자라면 비교하지 않는다 */
export function summarizeMarket(rows: MarketRow[], dong: string): Record<string, MarketValue | null> {
  const clean = rows.filter((r) => !r.is_share && !r.cancelled && r.price_per_pyeong !== null);
  const out: Record<string, MarketValue | null> = {};
  for (const code of ["SG", "GM", "TJ"]) {
    const all = clean.filter((r) => belongs(code, r)).map((r) => ({ v: Number(r.price_per_pyeong), d: r.umd_nm }));
    const inDong = all.filter((x) => x.d === dong).map((x) => x.v);
    const dongMedian = medianOrNull(inDong);
    if (dongMedian !== null) {
      out[code] = { median: dongMedian, count: inDong.length, scope: "동" };
      continue;
    }
    const sggMedian = medianOrNull(all.map((x) => x.v));
    out[code] = sggMedian === null ? null : { median: sggMedian, count: all.length, scope: "시군구" };
  }
  return out;
}
