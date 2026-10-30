// RE-B4(2026-10-30): 경기·인천 실거래 — 국토교통부 아파트 매매 실거래가(공공데이터포털 15126469, RTMSDataSvcAptTrade, 전국).
// 주소·요청 방식은 `realty-listing-alert/lib/trades.ts`와 같다(코드 복사, 서로 부르지 않음).
// 응답 한 줄을 지금의 서울 열린데이터 줄 모양(SeoulRtmsRow)으로 바꿔, 중복 키·PNU·건축물대장·공시가격·AI 분석·알림 코드를 그대로 쓴다.
// 순수 함수만 둔다(시험용, server-only 아님).
import type { SeoulRtmsRow } from "./client";

// 2026-10-31: 주거 세 유형. 국토부는 유형마다 서비스가 따로다(응답의 이름 칸: 아파트 aptNm, 연립 mhouseNm, 오피스텔 offiNm)
export const PROPERTY_TYPES = ["아파트", "빌라", "오피스텔"] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];
export const MOLIT_SERVICE: Record<PropertyType, { trade: string; rent: string }> = {
  아파트: { trade: "AptTrade", rent: "AptRent" },
  빌라: { trade: "RHTrade", rent: "RHRent" },
  오피스텔: { trade: "OffiTrade", rent: "OffiRent" },
};
export const molitUrl = (service: string) => `https://apis.data.go.kr/1613000/RTMSDataSvc${service}/getRTMSDataSvc${service}`;

/** 서울 자료의 건물 용도 → 유형. 세 유형 밖이면 null */
export function propertyTypeOf(usage: unknown): PropertyType | null {
  const u = String(usage ?? "").trim();
  if (u === "아파트" || u === "오피스텔" || u === "빌라") return u;
  return u === "연립다세대" ? "빌라" : null;
}

/** 회원이 받을 유형: 비어 있거나 잘못된 값이면 전체 */
export function normalizePropertyTypes(v: unknown): PropertyType[] {
  const list = Array.isArray(v) ? PROPERTY_TYPES.filter((t) => v.includes(t)) : [];
  return list.length ? list : [...PROPERTY_TYPES];
}

/** 시·군·구 → { 동 이름: 법정동 코드 뒤 5자리 } (legalDong.ts의 LEGAL_DONG을 부르는 쪽에서 넘김 — 시험·서버 둘 다 import 확장자 문제 없이 쓰려고) */
export type DongTable = Record<string, Record<string, string>>;

/** 동 이름 → 법정동 코드 뒤 5자리. 「남양읍 남양리」는 리 코드로(2026-10-31 표에 리 추가), 표에 없는 리는 읍·면 코드로 대신(그 필지 조회는 비어도 무해) */
export function legalDongCode(dongTable: DongTable, sggCd: string, umdNm: string): string {
  const table = dongTable[sggCd];
  if (!table) return "";
  const name = umdNm.trim().replace(/\s+/g, " ");
  return table[name] ?? table[name.split(" ")[0]] ?? "";
}

/** 지번 「1286」「25-9」「산12-1」 → { 산 여부, 본번, 부번 } (2026-10-30 실측: 국토부 응답에 bonbun·bubun 칸이 없고 jibun만 옴) */
export function splitJibun(jibun: string): { mountain: boolean; bun: string; ji: string } {
  const m = jibun.trim().match(/^(산\s*)?(\d+)(?:-(\d+))?$/);
  if (!m) return { mountain: false, bun: "", ji: "" };
  return { mountain: !!m[1], bun: String(Number(m[2])), ji: String(Number(m[3] ?? 0)) };
}


/** 조회할 달 「yyyymm」 — 이번 달과 지난달(한국 시간). 실거래는 계약 후 30일 안에 신고돼 지난달 거래가 늦게 들어온다 */
export function molitMonths(now: Date = new Date(), count = 2): string[] {
  const kst = new Date(now.getTime() + 9 * 3600 * 1000);
  return Array.from({ length: count }, (_, i) => i).map((i) => {
    const d = new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth() - i, 1));
    return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

/** 응답 JSON에서 줄 배열(한 줄이면 객체로 오는 경우 포함) */
export function molitItems(json: unknown): Record<string, unknown>[] {
  const items = (json as { response?: { body?: { items?: { item?: unknown } | "" } } })?.response?.body?.items;
  const item = items && typeof items === "object" ? (items as { item?: unknown }).item : undefined;
  if (Array.isArray(item)) return item as Record<string, unknown>[];
  return item && typeof item === "object" ? [item as Record<string, unknown>] : [];
}

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v).trim());

/** 국토부 한 줄 → 서울 줄 모양. 해제(취소)된 거래·금액/면적 없는 줄은 null */
export function molitItemToRow(it: Record<string, unknown>, sggNm: string, dongTable: DongTable = {}, type?: PropertyType): SeoulRtmsRow | null {
  if (str(it.cdealType)) return null; // 해제 신고된 거래(「O」)는 버림
  const amount = str(it.dealAmount).replace(/[,\s]/g, "");
  const area = str(it.excluUseAr);
  const y = str(it.dealYear);
  const m = str(it.dealMonth).padStart(2, "0");
  const d = str(it.dealDay).padStart(2, "0");
  if (!amount || !Number(amount) || !area || !Number(area) || y.length !== 4) return null;
  const sggCd = str(it.sggCd);
  const umdNm = str(it.umdNm);
  // 응답에 umdCd·bonbun·bubun·landCd가 있으면 쓰고, 없으면(2026-10 실제 응답) 동 이름·지번에서 만든다
  const jb = splitJibun(str(it.jibun));
  const mountain = str(it.landCd) ? str(it.landCd) === "2" : jb.mountain;
  return {
    RCPT_YR: y,
    CGG_CD: sggCd,
    CGG_NM: sggNm,
    STDG_CD: str(it.umdCd) || legalDongCode(dongTable, sggCd, umdNm),
    STDG_NM: umdNm,
    LOTNO_SE: mountain ? "2" : "1", // 1=대지, 2=산
    LOTNO_SE_NM: mountain ? "산" : "대지",
    MNO: str(it.bonbun).replace(/^0+(?=\d)/, "") || jb.bun,
    SNO: str(it.bubun).replace(/^0+(?=\d)/, "") || jb.ji,
    BLDG_NM: str(it.aptNm) || str(it.mhouseNm) || str(it.offiNm),
    ...(type ? { BLDG_USG: type } : {}),
    CTRT_DAY: `${y}${m}${d}`,
    THING_AMT: amount, // 만 원(서울 자료와 같은 단위)
    ARCH_AREA: area, // 전용면적 ㎡
    FLR: str(it.floor),
    ARCH_YR: str(it.buildYear),
  };
}

/** 응답들 → 서울 줄 모양 목록(계약일 최신순) */
export function molitRows(jsons: unknown[], sggNm: string, dongTable: DongTable = {}, type?: PropertyType): SeoulRtmsRow[] {
  const rows = jsons.flatMap((j) => molitItems(j)).map((it) => molitItemToRow(it, sggNm, dongTable, type)).filter((r): r is SeoulRtmsRow => !!r);
  return rows.sort((a, b) => b.CTRT_DAY.localeCompare(a.CTRT_DAY));
}

// 2026-10-31: 공시가·전월세를 같은 면적으로 맞춘다. 첫 줄만 쓰면 다른 세대 값이 들어갔다(경희궁의 아침 3단지: 거래 37.5㎡인데 필지에는 123㎡ 이상뿐).
// 이보다 면적 차이가 크면 다른 평형으로 보고 쓰지 않는다. 2㎡ 고정은 소형에 넓어(22.08㎡가 20.63㎡로 맞춰짐) 면적의 3%, 최소 1㎡로 바꿈(2026-10-31)
const areaTolerance = (area: number) => Math.max(1, area * 0.03);

const num = (v: unknown) => {
  const s = str(v).replace(/[,\s]/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

/** 공시가 줄들에서 면적이 가장 가까운 세대의 공시가(원). 같은 층이 있으면 그 층, 없으면 중간값. 맞는 면적이 없으면 null */
export function pickAssessedPrice(
  rows: { prvuseAr?: string; floorNm?: string; pblntfPc?: string }[],
  area: unknown,
  floor: unknown,
): number | null {
  const target = num(area);
  if (!target) return null;
  const valid = rows
    .map((r) => ({ area: num(r.prvuseAr), floor: str(r.floorNm), price: num(r.pblntfPc) }))
    .filter((r): r is { area: number; floor: string; price: number } => !!r.area && !!r.price);
  if (valid.length === 0) return null;
  const nearest = Math.min(...valid.map((r) => Math.abs(r.area - target)));
  if (nearest > areaTolerance(target)) return null;
  const sameArea = valid.filter((r) => Math.abs(r.area - target) === nearest);
  const sameFloor = sameArea.filter((r) => r.floor === str(floor));
  const pool = (sameFloor.length ? sameFloor : sameArea).map((r) => r.price).sort((a, b) => a - b);
  return pool[Math.floor((pool.length - 1) / 2)];
}

export interface RentComparable {
  name: string;
  dong: string;
  area: number | null;
  floor?: string;
  buildYear?: number | null;
  day: string; // yyyymmdd
  deposit: number | null; // 만 원
  rent: number | null; // 만 원
}

/** 국토부 전월세 응답들 → 비교용 줄 */
export function molitRentRows(jsons: unknown[]): RentComparable[] {
  return jsons
    .flatMap((j) => molitItems(j))
    .map((it) => ({
      name: str(it.aptNm) || str(it.mhouseNm) || str(it.offiNm),
      dong: str(it.umdNm),
      area: num(it.excluUseAr),
      floor: str(it.floor),
      buildYear: num(it.buildYear),
      day: `${str(it.dealYear)}${str(it.dealMonth).padStart(2, "0")}${str(it.dealDay).padStart(2, "0")}`,
      deposit: num(it.deposit),
      rent: num(it.monthlyRent),
    }))
    .filter((r) => r.name && r.deposit);
}

/** 서울 열린데이터 전월세 줄 → 비교용 줄. 면적 칸(RENT_AREA)이 없으면 이름만으로 맞춘다 */
export function seoulRentToComparables(rows: { BLDG_NM?: string; RENT_AREA?: string; CTRT_DAY?: string; GRFE?: string; RTFE?: string }[]): RentComparable[] {
  return rows.map((r) => ({
    name: str(r.BLDG_NM),
    dong: "",
    area: num(r.RENT_AREA),
    day: str(r.CTRT_DAY),
    deposit: num(r.GRFE),
    rent: num(r.RTFE),
  }));
}

const nameKey = (s: string) => s.replace(/\s+/g, "");

/** 같은 단지(같은 동)·같은 면적에서 최근 전세, 전세가 없으면 최근 월세 */
export function pickRentComparable(rows: RentComparable[], name: string, dong: string, area: unknown): RentComparable | null {
  const target = num(area);
  const matched = rows.filter(
    (r) =>
      r.deposit !== null &&
      nameKey(r.name) === nameKey(name) &&
      (!r.dong || !dong || r.dong === dong) &&
      (r.area === null || target === null || Math.abs(r.area - target) <= areaTolerance(target)),
  );
  const latest = (list: RentComparable[]) => [...list].sort((a, b) => b.day.localeCompare(a.day))[0] ?? null;
  return latest(matched.filter((r) => !r.rent)) ?? latest(matched);
}

// 전남광주통합특별시(코드 12): 국토부 실거래는 새 코드로 주지만, 브이월드 공시가·토지 자료는 2025년 기준이라 옛 코드(광주 29, 전남 46)로 저장돼 있다(2026-10-31 실측).
const OLD_SGG: Record<string, string> = {
  "12110": "46110", "12130": "46130", "12150": "46150", "12170": "46170", "12190": "46230",
  "12210": "29110", "12240": "29140", "12270": "29155", "12300": "29170", "12330": "29200",
  "12710": "46710", "12720": "46720", "12730": "46730", "12740": "46770", "12750": "46780", "12760": "46790", "12770": "46800", "12780": "46810", "12790": "46820",
  "12800": "46830", "12810": "46840", "12820": "46860", "12830": "46870", "12840": "46880", "12850": "46890", "12860": "46900", "12870": "46910",
};
/** 브이월드 조회용 필지 번호: 새 시·군·구 코드를 옛 코드로 바꾼다. 저장하는 값은 바꾸지 않는다 */
export function vworldPnu(pnu: string): string {
  const old = OLD_SGG[pnu.slice(0, 5)];
  return old ? old + pnu.slice(5) : pnu;
}

// 2026-10-31 v1.33: 전월세 거래도 목록·알림 대상. 알림 폭주와 AI 비용을 막으려고 기본은 매매만, 회원이 설정에서 켠다.
export const DEAL_TYPES = ["매매", "전세", "월세"] as const;
export type DealType = (typeof DEAL_TYPES)[number];

/** 회원이 받을 거래 종류: 비어 있거나 잘못된 값이면 매매만 */
export function normalizeDealTypes(v: unknown): DealType[] {
  const list = Array.isArray(v) ? DEAL_TYPES.filter((t) => v.includes(t)) : [];
  return list.length ? list : ["매매"];
}

/** 국토부 전월세 한 줄 → 표에 넣을 값. 보증금은 price_amount, 월세가 0이면 전세 */
export function rentToListing(r: RentComparable, type: PropertyType, sggCd: string, sggNm: string) {
  const dealType: DealType = r.rent ? "월세" : "전세";
  return {
    dedup_key: ["RENT", sggCd, type, r.day, r.dong, r.name, r.area, r.deposit, r.rent ?? 0, r.floor ?? ""].join("-"),
    sgg_cd: sggCd,
    sgg_nm: sggNm,
    stdg_nm: r.dong,
    bldg_nm: r.name,
    property_type: type,
    deal_type: dealType,
    floor: r.floor || null,
    contract_date: /^\d{8}$/.test(r.day) ? `${r.day.slice(0, 4)}-${r.day.slice(4, 6)}-${r.day.slice(6, 8)}` : null,
    building_area: r.area,
    exclusive_area: r.area,
    price_amount: r.deposit,
    monthly_rent: r.rent || null,
    building_year: r.buildYear ?? null,
    data_provided_at: new Date().toISOString().slice(0, 10),
  };
}
