// RQ-A4 1단계(2026-11-06): 한국부동산원 R-ONE 「상업용부동산 임대동향조사」 상권별 임대료·공실률.
// 순수 함수만(시험 tests/commercialRent.test.mjs). 서버 호출·저장은 commercialRentData.ts.
// 표 번호는 0단계 사전 검증(docs/evidence/a4-rone-probe-20261105.json) — 2026년 3분기부터의 새 표본.

export type RentKind = "large" | "small" | "set" | "office";
export const RENT_KINDS: RentKind[] = ["large", "small", "set", "office"];
export const RENT_KIND_LABEL: Record<RentKind, string> = { large: "중대형 상가", small: "소규모 상가", set: "집합 상가", office: "오피스" };

export const RONE_TABLES: { id: string; kind: RentKind; item: "rent" | "vacancy" }[] = [
  { id: "T269343143745470", kind: "large", item: "rent" },
  { id: "T269273143698159", kind: "small", item: "rent" },
  { id: "T265403143656863", kind: "set", item: "rent" },
  { id: "T264053143882231", kind: "office", item: "rent" },
  { id: "T267693143622612", kind: "large", item: "vacancy" },
  { id: "T262053143683833", kind: "small", item: "vacancy" },
  { id: "T267763143643502", kind: "set", item: "vacancy" },
  { id: "T266043143871521", kind: "office", item: "vacancy" },
];

/** 이 거리 안의 상권만 「가까운 상권」으로 보여 준다(넘으면 시·도 값) */
export const NEAR_KM = 1.5;

export interface RoneRow {
  WRTTIME_IDTFR_ID?: string;
  WRTTIME_DESC?: string;
  CLS_FULLNM?: string;
  CLS_NM?: string;
  ITM_NM?: string;
  DTA_VAL?: number | string | null;
}

/** 표 저장 줄: 분기 하나·상권 하나에 유형 4가지 × (임대료 천원/㎡, 공실률 %) */
export interface RentArea {
  quarter: string; // 202603
  quarter_label: string; // 2026년 3분기
  area: string; // 서울>강남>강남대로
  name: string; // 강남대로
  depth: number; // 1 전국·시도, 2~3 상권(서울은 2가 권역)
  /** 맨 끝 상권(좌표를 찾는 대상). 권역·시도·전국은 false */
  leaf?: boolean;
  rent: Partial<Record<RentKind, number>>;
  vacancy: Partial<Record<RentKind, number>>;
  lat?: number | null;
  lng?: number | null;
}

const num = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(String(v ?? "").trim());
  return Number.isFinite(n) && String(v ?? "").trim() !== "" ? Math.round(n * 100) / 100 : null;
};

/** R-ONE 응답(JSON)에서 줄 목록과 전체 건수를 꺼낸다. 오류 응답이면 그 코드·문구를 던진다 */
export function roneRows(json: unknown): { rows: RoneRow[]; total: number } {
  const root = (json ?? {}) as Record<string, unknown>;
  const result = (root.RESULT ?? (root as { result?: unknown }).result) as { CODE?: string; MESSAGE?: string } | undefined;
  if (result?.CODE && result.CODE !== "INFO-000") throw new Error(`R-ONE ${result.CODE} ${result.MESSAGE ?? ""}`.trim());
  const parts = root.SttsApiTblData;
  if (!Array.isArray(parts)) throw new Error("R-ONE 응답 모양이 다릅니다");
  let total = 0;
  let rows: RoneRow[] = [];
  for (const p of parts as Record<string, unknown>[]) {
    if (Array.isArray(p.head)) {
      for (const h of p.head as Record<string, unknown>[]) {
        if (h.list_total_count != null) total = Number(h.list_total_count) || 0;
        const r = h.RESULT as { CODE?: string; MESSAGE?: string } | undefined;
        if (r?.CODE && r.CODE !== "INFO-000") throw new Error(`R-ONE ${r.CODE} ${r.MESSAGE ?? ""}`.trim());
      }
    }
    if (Array.isArray(p.row)) rows = rows.concat(p.row as RoneRow[]);
  }
  return { rows, total };
}

/** 여러 표의 줄을 상권별 한 줄로 합친다 — 가장 최근 분기만 */
export function mergeRentRows(tables: { kind: RentKind; item: "rent" | "vacancy"; rows: RoneRow[] }[]): RentArea[] {
  const quarters = tables.flatMap((t) => t.rows.map((r) => String(r.WRTTIME_IDTFR_ID ?? ""))).filter((q) => /^\d{6}$/.test(q));
  if (!quarters.length) return [];
  const latest = quarters.sort().at(-1)!;
  const byArea = new Map<string, RentArea>();
  for (const t of tables) {
    for (const r of t.rows) {
      if (String(r.WRTTIME_IDTFR_ID) !== latest) continue;
      const area = String(r.CLS_FULLNM ?? "").trim();
      const v = num(r.DTA_VAL);
      if (!area || v === null) continue;
      const parts = area.split(">");
      const row = byArea.get(area) ?? { quarter: latest, quarter_label: String(r.WRTTIME_DESC ?? latest), area, name: parts.at(-1)!, depth: parts.length, rent: {}, vacancy: {} };
      row[t.item][t.kind] = v;
      byArea.set(area, row);
    }
  }
  const out = [...byArea.values()];
  // 서울 「서울>강남」처럼 아래 상권이 있는 권역은 장소가 아니다 — 좌표를 찾지 않는다
  const parents = new Set(out.flatMap((r) => r.area.split(">").slice(0, -1).map((_, i, a) => a.slice(0, i + 1).join(">"))));
  for (const r of out) r.leaf = r.depth >= 2 && !parents.has(r.area);
  return out;
}

// 시·도 코드(법정동 앞 2자리) → R-ONE 1단계 이름 후보(행정구역 개편 「전남광주」 포함)
const SIDO_NAMES: Record<string, string[]> = {
  "11": ["서울"], "26": ["부산"], "27": ["대구"], "28": ["인천"], "29": ["광주", "전남광주"], "30": ["대전"], "31": ["울산"], "36": ["세종"],
  "41": ["경기"], "42": ["강원"], "51": ["강원"], "43": ["충북"], "44": ["충남"], "45": ["전북"], "52": ["전북"], "46": ["전남", "전남광주"],
  "47": ["경북"], "48": ["경남"], "50": ["제주"],
};
// 브이월드 주소 앞부분과 맞춰 볼 글자(장소 검색이 다른 시·도의 같은 이름을 고르지 않게)
const SIDO_ADDR: Record<string, string[]> = {
  서울: ["서울"], 부산: ["부산"], 대구: ["대구"], 인천: ["인천"], 광주: ["광주광역"], 대전: ["대전"], 울산: ["울산"], 세종: ["세종"],
  경기: ["경기"], 강원: ["강원"], 충북: ["충청북", "충북"], 충남: ["충청남", "충남"], 전북: ["전북", "전라북"], 전남: ["전라남", "전남"],
  전남광주: ["전라남", "전남", "광주광역"], 경북: ["경상북", "경북"], 경남: ["경상남", "경남"], 제주: ["제주"],
};

/** 상권 「서울>강남>강남대로」의 시·도 부분 */
export const sidoOfArea = (area: string) => area.split(">")[0];

/** 브이월드 장소 검색 결과 중 같은 시·도에 있는 첫 곳 */
export function pickPlace(items: { address?: string; x: number; y: number }[], sido: string): { lat: number; lng: number } | null {
  const keys = SIDO_ADDR[sido] ?? [sido];
  const hit = items.find((it) => keys.some((k) => String(it.address ?? "").startsWith(k)));
  return hit && Number.isFinite(hit.x) && Number.isFinite(hit.y) ? { lat: hit.y, lng: hit.x } : null;
}

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export interface RentNearby {
  quarter: string;
  quarterLabel: string;
  /** 가까운 상권(없으면 null) */
  near: (Pick<RentArea, "area" | "name" | "rent" | "vacancy"> & { km: number }) | null;
  sido: Pick<RentArea, "area" | "rent" | "vacancy"> | null;
  nation: Pick<RentArea, "rent" | "vacancy"> | null;
}

/** 필지 좌표·시군구 코드로 가까운 상권(NEAR_KM 안)·시도·전국 값을 고른다 */
export function pickNearby(rows: RentArea[], point: { x: number; y: number } | null | undefined, sggCd: string): RentNearby | null {
  if (!rows.length) return null;
  const pt = point ? { lat: point.y, lng: point.x } : null;
  const sidoNames = SIDO_NAMES[sggCd.slice(0, 2)] ?? [];
  let near: RentNearby["near"] = null;
  if (pt) {
    for (const r of rows) {
      if (r.depth < 2 || r.lat == null || r.lng == null) continue;
      const km = distanceKm(pt, { lat: r.lat, lng: r.lng });
      if (km <= NEAR_KM && (!near || km < near.km)) near = { area: r.area, name: r.name, rent: r.rent, vacancy: r.vacancy, km: Math.round(km * 10) / 10 };
    }
  }
  const sidoRow = rows.find((r) => r.depth === 1 && sidoNames.includes(r.area)) ?? null;
  const nationRow = rows.find((r) => r.depth === 1 && r.area === "전국") ?? null;
  return {
    quarter: rows[0].quarter,
    quarterLabel: rows[0].quarter_label,
    near,
    sido: sidoRow ? { area: sidoRow.area, rent: sidoRow.rent, vacancy: sidoRow.vacancy } : null,
    nation: nationRow ? { rent: nationRow.rent, vacancy: nationRow.vacancy } : null,
  };
}
