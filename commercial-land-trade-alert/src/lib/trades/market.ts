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
  floor?: string | null;
  area_m2?: number | string | null;
  plot_m2?: number | string | null;
  deal_date?: string | null;
  build_year?: number | string | null;
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
    const mine = clean.filter((r) => belongs(code, r));
    const all = (code === "TJ" ? mergeLandBundles(mine) : mine).map((r) => ({ v: Number(r.price_per_pyeong), d: r.umd_nm }));
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

/** 실거래 층 표기를 지하·1층·2층 이상으로 나눈다. 비어 있거나 알 수 없으면 null */
export function floorBucket(floor: string | null | undefined): "b" | "1" | "2" | null {
  const s = String(floor ?? "").trim();
  if (/^(-|B|지하)/i.test(s)) return "b";
  const n = Number(s);
  if (!s || !Number.isInteger(n) || n < 1) return null;
  return n === 1 ? "1" : "2";
}

// 층·면적은 매물마다 달라 확장이 회원 PC에서 고른다. 그래서 매물을 서버로 보내지 않고 공개 실거래 표본만 내려 준다.
// 토지 표본에는 같은 지목끼리 비교하도록 지목을 붙인다. 상가·건물에는 비슷한 연식끼리 비교하도록 건축년도를 붙인다(2026-11-02 주인님 의견).
// 일반건물에는 대지 평당가를 7번째 칸으로 붙인다. 연면적·대지 한 기준만 보면 헛짚기 쉬워 두 기준을 함께 본다(2026-11-02 플랜 §1). 옛 확장은 이 칸을 무시한다.
export type MarketSample = [floor: "b" | "1" | "2" | null, area: number, perPyeong: number, inDong: 0 | 1, jimok?: string | null, buildYear?: number | null, plotPerPyeong?: number | null];

/** 같은 날·같은 동·같은 면적·같은 평당가인 건물 거래는 한 건으로 본다(실거래에 중복으로 보이는 줄, 2026-11-02 역삼 3쌍) */
function dedupeBuildings(rows: MarketRow[]): MarketRow[] {
  const seen = new Set<string>();
  return rows.filter((r) => {
    const key = [r.deal_date, r.umd_nm, r.area_m2, r.plot_m2, r.price_per_pyeong].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * 여러 필지를 한 번에 판 토지 거래는 필지마다 같은 평당가로 찍혀 중간값을 흔든다(고양 70건 중 48건).
 * 같은 날·같은 동·같은 평당가 묶음을 면적 합계 한 건으로 합치고, 지목은 가장 넓은 필지 것을 쓴다.
 */
export function mergeLandBundles(rows: MarketRow[]): MarketRow[] {
  const groups = new Map<string, MarketRow[]>();
  for (const r of rows) {
    const key = [r.deal_date, r.umd_nm, r.price_per_pyeong].join("|");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }
  return [...groups.values()].map((g) => {
    if (g.length === 1) return g[0];
    const widest = g.reduce((a, b) => (Number(b.area_m2) > Number(a.area_m2) ? b : a));
    return { ...widest, area_m2: g.reduce((s, r) => s + Number(r.area_m2), 0) };
  });
}

export function marketSamples(rows: MarketRow[], dong: string): Record<string, MarketSample[]> {
  const clean = rows.filter((r) => !r.is_share && !r.cancelled && r.price_per_pyeong !== null && Number(r.area_m2) > 0);
  const out: Record<string, MarketSample[]> = {};
  for (const code of ["SG", "GM", "TJ"]) {
    const mine = clean.filter((r) => belongs(code, r));
    const list = code === "TJ" ? mergeLandBundles(mine) : dedupeBuildings(mine);
    out[code] = list.map((r): MarketSample => {
      const inDong = r.umd_nm === dong ? 1 : 0;
      if (code === "TJ") return [floorBucket(r.floor), Number(r.area_m2), Number(r.price_per_pyeong), inDong, r.category];
      const buildYear = Number(r.build_year) > 1900 ? Number(r.build_year) : null;
      if (code === "SG") return [floorBucket(r.floor), Number(r.area_m2), Number(r.price_per_pyeong), inDong, null, buildYear];
      // 평당가는 연면적 기준이라 같은 거래금액을 대지면적으로 다시 나눈다
      const plot = Number(r.plot_m2);
      const plotPerPyeong = plot > 0 ? Math.round((Number(r.price_per_pyeong) * Number(r.area_m2)) / plot) : null;
      return [floorBucket(r.floor), Number(r.area_m2), Number(r.price_per_pyeong), inDong, null, buildYear, plotPerPyeong];
    });
  }
  return out;
}
