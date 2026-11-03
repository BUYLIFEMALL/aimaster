// B1 주소 리포트(2026-11-03, 플랜 docs/PLAN_20261102_B_ADDRESS_REPORT.md): 한 필지의 국토부 매매·전월세를 모아 요약한다.
// 순수 함수만 둔다(시험 대상). 원본 응답은 reportData.ts가 받아 온다.
// 다른 파일을 불러오지 않는다(node 시험이 확장자 없는 import를 못 읽음). 응답 줄 꺼내기·지번 나누기는 molit.ts와 같은 규칙.

export const REPORT_MONTHS = 12;
export const REPORT_AREA_TOLERANCE = 3; // 같은 평형으로 보는 전용면적 차이(㎡), A2 최고가 비교와 같다

export interface ReportDeal {
  day: string; // yyyymmdd
  name: string;
  area: number | null;
  floor: string;
  amount: number | null; // 매매가 또는 보증금(만 원)
  rent: number | null; // 월세(만 원), 매매·전세는 null
}

export interface LotTarget {
  pnu: string; // 19자리
  name?: string | null;
  dong?: string | null;
  area?: number | null;
}

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v).trim());
const num = (v: unknown) => {
  const s = str(v).replace(/[,\s]/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};
const nameKey = (s: string) => s.replace(/\s+/g, "");

function items(json: unknown): Record<string, unknown>[] {
  const box = (json as { response?: { body?: { items?: { item?: unknown } | "" } } })?.response?.body?.items;
  const item = box && typeof box === "object" ? (box as { item?: unknown }).item : undefined;
  if (Array.isArray(item)) return item as Record<string, unknown>[];
  return item && typeof item === "object" ? [item as Record<string, unknown>] : [];
}

function splitJibun(jibun: string): { mountain: boolean; bun: string; ji: string } {
  const m = jibun.trim().match(/^(산\s*)?(\d+)(?:-(\d+))?$/);
  if (!m) return { mountain: false, bun: "", ji: "" };
  return { mountain: !!m[1], bun: String(Number(m[2])), ji: String(Number(m[3] ?? 0)) };
}

/** 국토부 응답들 → 이 필지(지번 번호가 같거나, 이름·동이 같은) 거래만. 면적을 알면 ±3㎡로 거른다 */
/** dongCode: 동 이름 → 법정동 코드 뒤 5자리(legalDongCode를 부르는 쪽에서 넘김) */
export function lotDeals(jsons: unknown[], target: LotTarget, dongCode: (umdNm: string) => string, deal: "trade" | "rent"): ReportDeal[] {
  const bjdong = target.pnu.slice(5, 10);
  const mountain = target.pnu[10] === "2";
  const bun = String(Number(target.pnu.slice(11, 15)));
  const ji = String(Number(target.pnu.slice(15, 19)));
  const out: ReportDeal[] = [];
  for (const it of jsons.flatMap((j) => items(j))) {
    if (deal === "trade" && str(it.cdealType)) continue; // 해제된 거래
    const name = str(it.aptNm) || str(it.mhouseNm) || str(it.offiNm);
    const umd = str(it.umdNm);
    const jb = splitJibun(str(it.jibun));
    const code = str(it.umdCd) || dongCode(umd);
    const sameLot = !!jb.bun && code === bjdong && jb.mountain === mountain && jb.bun === bun && jb.ji === ji;
    const sameName = !!target.name && !!name && nameKey(name) === nameKey(target.name) && (!target.dong || umd === target.dong);
    if (!sameLot && !sameName) continue;
    const area = num(it.excluUseAr);
    if (target.area && area && Math.abs(area - target.area) > REPORT_AREA_TOLERANCE) continue;
    const amount = deal === "trade" ? num(it.dealAmount) : num(it.deposit);
    if (!amount) continue;
    out.push({
      day: `${str(it.dealYear)}${str(it.dealMonth).padStart(2, "0")}${str(it.dealDay).padStart(2, "0")}`,
      name,
      area,
      floor: str(it.floor),
      amount,
      rent: deal === "rent" ? num(it.monthlyRent) || null : null,
    });
  }
  return out.sort((a, b) => b.day.localeCompare(a.day));
}

export function median(values: number[]): number | null {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : Math.round((v[m - 1] + v[m]) / 2);
}

export interface DealSummary {
  count: number;
  median: number | null;
  latest: ReportDeal | null;
  min: number | null;
  max: number | null;
  byMonth: { ym: string; median: number; count: number }[]; // 오래된 달부터
}

export function summarize(deals: ReportDeal[]): DealSummary {
  const amounts = deals.map((d) => d.amount ?? NaN).filter(Number.isFinite);
  const groups = new Map<string, number[]>();
  for (const d of deals) if (d.amount) groups.set(d.day.slice(0, 6), [...(groups.get(d.day.slice(0, 6)) ?? []), d.amount]);
  return {
    count: deals.length,
    median: median(amounts),
    latest: deals[0] ?? null,
    min: amounts.length ? Math.min(...amounts) : null,
    max: amounts.length ? Math.max(...amounts) : null,
    byMonth: [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([ym, v]) => ({ ym, median: median(v) as number, count: v.length })),
  };
}

/** 전세가율(%) = 전세 중간값 ÷ 매매 중간값. 둘 다 있어야 한다 */
export function jeonseRatio(saleMedian: number | null, jeonseMedian: number | null): number | null {
  if (!saleMedian || !jeonseMedian) return null;
  return Math.round((jeonseMedian / saleMedian) * 100);
}

/** 브이월드 용도지역 목록(쉼표)에서 핵심인 「○○지역」(제2종일반주거지역·일반상업지역·자연녹지지역 등)만. 「도시지역」은 뺀다 */
export function mainZones(useZones: string | null | undefined): string[] {
  return [...new Set(str(useZones).split(",").map((z) => z.trim()).filter((z) => /(주거|상업|공업|녹지|관리|농림|자연환경보전)지역$/.test(z)))];
}

export interface BuildingFacts {
  approvalDay: string | null; // yyyy-mm-dd
  ageYears: number | null;
  floorAreaRatio: number | null; // 용적률 %
  coverageRatio: number | null; // 건폐율 %
  parking: number | null;
  households: number | null;
  topFloor: number | null;
}

/**
 * B2(2026-11-03) 호가 입력 → 만 원. 「8억 5,000」「8.5억」「85000」「8억」 모두 받는다. 읽지 못하면 null.
 * 숫자만 있으면 만 원으로 본다(실거래 금액과 같은 단위).
 */
export function parseAskingPrice(text: string | null | undefined): number | null {
  const s = str(text).replace(/[,\s원]/g, "");
  if (!s) return null;
  const m = s.match(/^(?:(\d+(?:\.\d+)?)억)?(?:(\d+)(?:만)?)?$/);
  if (!m || (!m[1] && !m[2])) return null;
  const v = Math.round((m[1] ? Number(m[1]) * 10000 : 0) + (m[2] ? Number(m[2]) : 0));
  return v > 0 && v < 10_000_000 ? v : null;
}

/** 호가가 기준값보다 몇 % 높은지(낮으면 음수). 기준이 없으면 null */
export function diffPct(asking: number, base: number | null | undefined): number | null {
  if (!base || base <= 0) return null;
  return Math.round(((asking - base) / base) * 1000) / 10;
}

const PARKING_KEYS =["indrAutoUtcnt", "oudrAutoUtcnt", "indrMechUtcnt", "oudrMechUtcnt"];

/**
 * 표제부 여러 줄(동별) → 대표값. 사용승인일은 가장 이른 날, 층은 최고.
 * B2(2026-11-03): 총괄표제부(`recap`)가 있으면 용적률·건폐율·세대·주차는 그 값을 먼저 쓴다(동별 표제부는 비율이 0인 경우가 많음).
 * 없으면 표제부 합계 — 단, 동마다 같은 주차 수가 반복되면(단지 전체 값을 동마다 담은 경우, 파크리오 205,086대 사례) 한 번만 센다.
 */
export function buildingFacts(titles: Record<string, unknown>[], now: Date, recap: Record<string, unknown>[] = []): BuildingFacts | null {
  if (!titles.length && !recap.length) return null;
  const pos = (rows: Record<string, unknown>[], k: string) => rows.map((t) => num(t[k])).filter((n): n is number => n !== null && n > 0);
  const days = [...titles, ...recap].map((t) => str(t.useAprDay)).filter((d) => /^\d{8}$/.test(d)).sort();
  const day = days[0] ?? null;
  const rowParking = (t: Record<string, unknown>) => PARKING_KEYS.reduce((m, k) => m + (num(t[k]) ?? 0), 0);
  const perTitle = titles.map(rowParking).filter((n) => n > 0);
  const titleParking = perTitle.length > 1 && perTitle.every((n) => n === perTitle[0]) ? perTitle[0] : perTitle.reduce((a, b) => a + b, 0);
  const recapParking = recap.map((t) => num(t.totPkngCnt) || rowParking(t)).find((n) => n > 0) ?? 0;
  const households = pos(recap, "hhldCnt")[0] ?? titles.reduce((n, t) => n + (num(t.hhldCnt) ?? 0), 0);
  const first = (k: string) => pos(recap, k)[0] ?? pos(titles, k)[0] ?? null;
  const floors = pos(titles, "grndFlrCnt");
  return {
    approvalDay: day ? `${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}` : null,
    ageYears: day ? now.getFullYear() - Number(day.slice(0, 4)) : null,
    floorAreaRatio: first("vlRat"),
    coverageRatio: first("bcRat"),
    parking: recapParking || titleParking || null,
    households: households || null,
    topFloor: floors.length ? Math.max(...floors) : null,
  };
}
