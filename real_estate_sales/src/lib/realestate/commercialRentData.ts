import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { vworldAuthParams } from "@/lib/publicdata/client";
import { mergeRentRows, pickNearby, pickPlace, RONE_TABLES, roneRows, sidoOfArea, type RentArea, type RentNearby, type RoneRow } from "@/lib/realestate/commercialRent";

// RQ-A4 1단계(2026-11-06): R-ONE 상권 임대료·공실률 — 분기 캐시 표 rone_commercial_rent.
// 키는 운영 공용 RONE_API_KEY(공공 무료 자료 §8), 좌표는 공용 브이월드 키. 관리자 갱신 주소 /api/admin/rone-refresh.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = { from: (t: string) => any };
const TABLE = "rone_commercial_rent";

async function fetchRoneTable(id: string): Promise<RoneRow[]> {
  const key = process.env.RONE_API_KEY?.trim();
  if (!key) throw new Error("RONE_API_KEY가 없습니다");
  let rows: RoneRow[] = [];
  for (let page = 1; page <= 5; page++) {
    const qs = new URLSearchParams({ KEY: key, Type: "json", STATBL_ID: id, DTACYCLE_CD: "QY", pIndex: String(page), pSize: "1000" });
    const res = await fetch(`https://www.reb.or.kr/r-one/openapi/SttsApiTblData.do?${qs}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`R-ONE ${id} HTTP ${res.status}`);
    const { rows: got, total } = roneRows(await res.json());
    rows = rows.concat(got);
    if (!got.length || rows.length >= total) break;
  }
  return rows;
}

/** 브이월드 장소 검색으로 상권 이름 → 좌표. 같은 시·도 주소만 받는다 */
async function geocodeArea(name: string, sido: string): Promise<{ lat: number; lng: number } | null> {
  const { key, domain } = vworldAuthParams();
  const qs = new URLSearchParams({ service: "search", request: "search", version: "2.0", crs: "EPSG:4326", size: "10", page: "1", query: name, type: "place", format: "json", errorformat: "json", key, domain });
  const res = await fetch(`https://api.vworld.kr/req/search?${qs}`, { cache: "no-store" });
  if (!res.ok) return null;
  const j = (await res.json().catch(() => null)) as { response?: { result?: { items?: { address?: { parcel?: string; road?: string }; point?: { x?: string; y?: string } }[] } } } | null;
  const items = (j?.response?.result?.items ?? []).map((it) => ({ address: it.address?.parcel || it.address?.road || "", x: Number(it.point?.x), y: Number(it.point?.y) }));
  return pickPlace(items, sido);
}

export interface RefreshResult {
  quarter: string | null;
  areas: number;
  tables: { id: string; rows: number }[];
  geocoded: number;
  notFound: string[];
  remaining: number;
  ms: number;
}

/** R-ONE 표 8개를 받아 최근 분기를 저장하고, 좌표 없는 상권을 geocodeLimit개까지 채운다(여러 번 불러 나눠 채움) */
export async function refreshCommercialRent(geocodeLimit = 60, skipFetch = false): Promise<RefreshResult> {
  const started = Date.now();
  const db = createAdminClient() as unknown as Loose;
  const tables: RefreshResult["tables"] = [];
  let quarter: string | null = null;
  let areas = 0;
  if (!skipFetch) {
    const fetched = [];
    for (const t of RONE_TABLES) {
      const rows = await fetchRoneTable(t.id);
      tables.push({ id: t.id, rows: rows.length });
      fetched.push({ kind: t.kind, item: t.item, rows });
    }
    const merged = mergeRentRows(fetched);
    if (!merged.length) throw new Error("R-ONE에서 받은 값이 없습니다");
    quarter = merged[0].quarter;
    // 지난 분기에 찾은 좌표는 같은 상권 이름으로 다시 쓴다
    const { data: known } = await db.from(TABLE).select("area, lat, lng, geocode_tried_at").not("geocode_tried_at", "is", null).order("quarter", { ascending: false });
    const coord = new Map<string, { lat: number | null; lng: number | null; geocode_tried_at: string }>();
    for (const k of (known ?? []) as { area: string; lat: number | null; lng: number | null; geocode_tried_at: string }[]) if (!coord.has(k.area)) coord.set(k.area, k);
    const now = new Date().toISOString();
    const rows = merged.map((r) => ({ quarter: r.quarter, area: r.area, quarter_label: r.quarter_label, name: r.name, depth: r.depth, leaf: !!r.leaf, rent: r.rent, vacancy: r.vacancy, ...(coord.get(r.area) ?? {}), updated_at: now }));
    const { error } = await db.from(TABLE).upsert(rows, { onConflict: "quarter,area" });
    if (error) throw new Error(`저장 실패: ${error.message}`);
    areas = rows.length;
  }
  const { data: latest } = await db.from(TABLE).select("quarter").order("quarter", { ascending: false }).limit(1);
  quarter = quarter ?? latest?.[0]?.quarter ?? null;
  let geocoded = 0;
  const notFound: string[] = [];
  let remaining = 0;
  if (quarter) {
    const { data: todo } = await db.from(TABLE).select("area, name").eq("quarter", quarter).eq("leaf", true).is("geocode_tried_at", null);
    const list = (todo ?? []) as { area: string; name: string }[];
    remaining = Math.max(0, list.length - geocodeLimit);
    for (const r of list.slice(0, geocodeLimit)) {
      const p = await geocodeArea(r.name, sidoOfArea(r.area)).catch(() => null);
      if (p) geocoded++;
      else notFound.push(r.area);
      await db.from(TABLE).update({ lat: p?.lat ?? null, lng: p?.lng ?? null, geocode_tried_at: new Date().toISOString() }).eq("area", r.area).is("geocode_tried_at", null);
    }
  }
  return { quarter, areas, tables, geocoded, notFound, remaining, ms: Date.now() - started };
}

let cache: { at: number; rows: RentArea[] } | null = null;

/** 리포트용: 가장 최근 분기 표를 읽어(인스턴스당 1시간 기억) 가까운 상권·시도·전국 값을 고른다. 표가 비었거나 실패하면 null */
export async function loadCommercialRentNearby(point: { x: number; y: number } | null | undefined, sggCd: string): Promise<RentNearby | null> {
  try {
    if (!cache || Date.now() - cache.at > 3600_000) {
      const db = createAdminClient() as unknown as Loose;
      const { data: q } = await db.from(TABLE).select("quarter").order("quarter", { ascending: false }).limit(1);
      const quarter = q?.[0]?.quarter;
      const { data } = quarter ? await db.from(TABLE).select("quarter, quarter_label, area, name, depth, leaf, rent, vacancy, lat, lng").eq("quarter", quarter) : { data: [] };
      cache = { at: Date.now(), rows: (data ?? []) as RentArea[] };
    }
    return pickNearby(cache.rows, point, sggCd);
  } catch {
    return null;
  }
}
