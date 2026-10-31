// 국토부 상업업무용(NrgTrade)·토지(LandTrade) 응답을 저장 형태로 바꾼다. 순수 함수만 둔다(시험 대상).

export type TradeKind = "building" | "land";

export interface TradeRow {
  trade_key: string;
  kind: TradeKind;
  sgg_cd: string;
  sgg_nm: string;
  umd_nm: string;
  jibun: string;
  jibun_masked: boolean;
  deal_date: string;
  amount_manwon: number;
  category: string;
  building_type: string | null;
  land_use: string | null;
  area_m2: number | null;
  plot_m2: number | null;
  floor: string | null;
  build_year: number | null;
  is_share: boolean;
  dealing_type: string | null;
  cancelled: boolean;
  cancelled_on: string | null;
  price_per_pyeong: number | null;
}

type Raw = Record<string, unknown>;

const text = (v: unknown) => (v === null || v === undefined ? "" : String(v).trim());
const num = (v: unknown): number | null => {
  const s = text(v).replace(/,/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

const SQM_PER_PYEONG = 3.3058;

/** 면적 ㎡와 금액(만 원)으로 평당가(만 원). 면적이 없으면 null */
export function pricePerPyeong(amountManwon: number, areaM2: number | null): number | null {
  if (!areaM2 || areaM2 <= 0) return null;
  return Math.round((amountManwon / (areaM2 / SQM_PER_PYEONG)) * 10) / 10;
}

/** 응답 본문에서 줄 목록과 전체 건수를 꺼낸다. 한 건이면 배열이 아니라 객체로 온다 */
export function molitItems(json: unknown): { items: Raw[]; total: number } {
  const body = (json as { response?: { body?: { items?: { item?: Raw | Raw[] } | string; totalCount?: number | string } } })?.response?.body;
  const items = typeof body?.items === "object" ? body?.items?.item : undefined;
  return { items: Array.isArray(items) ? items : items ? [items] : [], total: Number(body?.totalCount ?? 0) || 0 };
}

function parseOne(kind: TradeKind, raw: Raw, sggCd: string, sggNm: string): Omit<TradeRow, "trade_key"> | null {
  const amount = num(raw.dealAmount);
  const y = num(raw.dealYear);
  const m = num(raw.dealMonth);
  const d = num(raw.dealDay);
  if (amount === null || !y || !m || !d) return null;
  const jibun = text(raw.jibun);
  const area = kind === "building" ? num(raw.buildingAr) : num(raw.dealArea);
  return {
    kind,
    sgg_cd: sggCd,
    sgg_nm: sggNm,
    umd_nm: text(raw.umdNm),
    jibun,
    jibun_masked: jibun === "" || jibun.includes("*"),
    deal_date: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    amount_manwon: amount,
    category: text(kind === "building" ? raw.buildingUse : raw.jimok),
    building_type: kind === "building" ? text(raw.buildingType) || null : null,
    land_use: text(raw.landUse) || null,
    area_m2: area,
    plot_m2: kind === "building" ? num(raw.plottageAr) : null,
    floor: text(raw.floor) || null,
    build_year: kind === "building" ? num(raw.buildYear) : null,
    is_share: text(raw.shareDealingType).includes("지분"),
    dealing_type: text(raw.dealingGbn) || null,
    cancelled: text(raw.cdealType) !== "",
    cancelled_on: text(raw.cdealDay) || null,
    price_per_pyeong: pricePerPyeong(amount, area),
  };
}

/**
 * 고유 번호가 없는 자료라 내용으로 키를 만든다. 같은 내용의 줄이 실제로 여러 건 있으므로(2026-10-31 실측: 토지 1,007줄 중 387줄)
 * 같은 키 안의 순번을 붙여 다른 거래가 사라지지 않게 한다. 취소 여부는 키에 넣지 않아 나중에 취소되면 같은 줄이 갱신된다.
 */
export function parseTrades(kind: TradeKind, items: Raw[], sggCd: string, sggNm: string): TradeRow[] {
  const seen = new Map<string, number>();
  const out: TradeRow[] = [];
  for (const raw of items) {
    const row = parseOne(kind, raw, sggCd, sggNm);
    if (!row) continue;
    const base = [kind, sggCd, row.umd_nm, row.jibun, row.deal_date, row.amount_manwon, row.area_m2 ?? "", row.category, row.floor ?? ""].join("|");
    const seq = (seen.get(base) ?? 0) + 1;
    seen.set(base, seq);
    out.push({ ...row, trade_key: `${base}#${seq}` });
  }
  return out;
}

/** 표본 수가 적으면 비교가 왜곡되므로 5건 미만은 null */
export function medianOrNull(values: number[], minSamples = 5): number | null {
  if (values.length < minSamples) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** 한국 시간 기준 offset 달 전의 YYYYMM */
export function monthKey(now: Date, offset: number): string {
  const kst = new Date(now.getTime() + 9 * 3600 * 1000);
  const d = new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth() - offset, 1));
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function kstDay(now: Date): string {
  return new Date(now.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

export function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 86400000).toISOString();
}
