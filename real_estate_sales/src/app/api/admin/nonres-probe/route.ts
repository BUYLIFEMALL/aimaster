import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchMolitServiceMonth, vworldAuthParams } from "@/lib/publicdata/client";
import { molitItems, molitMonths } from "@/lib/publicdata/molit";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

// RQ-B5 0단계 사전 검증(2026-11-05 주인님 「진행해」, 플랜 docs/PLAN_20261105_RQ_B5_NONRES_REPORT_MAP.md).
// 비주거 주소 리포트에 넣을 거래가 필지·동 단위로 얼마나 잡히는지, 브이월드 정적 지도·주소→좌표가 되는지 잰다.
// 관리자 전용·읽기만. 공공 자료라 회원 정보 없음. 운영자 공공 무료 키(예외 §8). 키 값은 응답에 싣지 않는다.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = { from: (t: string) => any };
type Raw = Record<string, unknown>;
const s = (v: unknown) => (v === null || v === undefined ? "" : String(v).trim());
const valid = (r: Raw) => !s(r.cdealType) && !s(r.shareDealingType).includes("지분");

type Sample = { kind: "집합" | "일반" | "토지"; sgg_cd: string; sgg_nm: string; umd_nm: string; jibun: string; category: string };

export async function GET() {
  const { data: auth } = await (await createClient()).auth.getUser();
  const db = createAdminClient() as unknown as Loose;
  if (!auth.user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  // 관리자 또는 운영 계정 표시(retention_exempt — 관리자·시험 계정 두 곳만, docs/PLAN_20261031_RETENTION_EXEMPT_ACCOUNTS.md)
  const { data: profile } = await db.from("profiles").select("is_admin, retention_exempt").eq("id", auth.user.id).maybeSingle();
  if (!profile?.is_admin && !profile?.retention_exempt) return NextResponse.json({ error: "관리자만 볼 수 있습니다." }, { status: 403 });

  // 표본: 상가 프로그램이 모은 공용 거래 표에서 서로 다른 필지 — 집합 5·일반 5·토지 5, 호출을 줄이려고 시군구 3곳 안에서
  const { data: rows } = await db
    .from("commercial_land_trades")
    .select("kind, sgg_cd, sgg_nm, umd_nm, jibun, jibun_masked, building_type, category")
    .eq("cancelled", false)
    .order("deal_date", { ascending: false })
    .limit(3000);
  const all = (rows ?? []) as { kind: string; sgg_cd: string; sgg_nm: string; umd_nm: string; jibun: string; jibun_masked: boolean; building_type: string | null; category: string }[];
  const sggs = [...new Set(all.map((r) => r.sgg_cd))].slice(0, 3);
  const samples: Sample[] = [];
  const pick = (kind: Sample["kind"], test: (r: (typeof all)[number]) => boolean) => {
    const seen = new Set<string>();
    for (const r of all) {
      if (!sggs.includes(r.sgg_cd) || !test(r)) continue;
      const k = `${r.sgg_cd}|${r.umd_nm}|${r.jibun}|${r.category}`;
      if (seen.has(k)) continue;
      seen.add(k);
      samples.push({ kind, sgg_cd: r.sgg_cd, sgg_nm: r.sgg_nm, umd_nm: r.umd_nm, jibun: r.jibun, category: r.category });
      if (seen.size >= 5) break;
    }
  };
  pick("집합", (r) => r.kind === "building" && r.building_type === "집합" && !r.jibun_masked);
  pick("일반", (r) => r.kind === "building" && r.building_type === "일반");
  pick("토지", (r) => r.kind === "land");

  // 시군구마다 상업업무용 12달·토지 6달을 한 번씩만 받는다
  const calls = { NrgTrade: 0, LandTrade: 0 };
  const cache = new Map<string, Raw[]>();
  const errors: string[] = [];
  const load = async (service: "NrgTrade" | "LandTrade", sgg: string, months: number) => {
    const k = `${service}|${sgg}`;
    if (cache.has(k)) return cache.get(k)!;
    const out: Raw[] = [];
    for (const ym of molitMonths(new Date(), months)) {
      try {
        out.push(...molitItems(await fetchMolitServiceMonth({ service, sggCd: sgg, ymd: ym })));
      } catch (e) {
        errors.push(`${service} ${sgg} ${ym}: ${e instanceof Error ? e.message : e}`);
      }
      calls[service]++;
    }
    cache.set(k, out);
    return out;
  };

  const result: Record<string, unknown>[] = [];
  for (const sm of samples) {
    if (sm.kind === "토지") {
      const land = (await load("LandTrade", sm.sgg_cd, 6)).filter(valid);
      result.push({ ...sm, sameDongSameJimok6m: land.filter((r) => s(r.umdNm) === sm.umd_nm && s(r.jimok) === sm.category).length, sameDong6m: land.filter((r) => s(r.umdNm) === sm.umd_nm).length });
    } else {
      const bld = (await load("NrgTrade", sm.sgg_cd, 12)).filter(valid);
      const sameDongUse = bld.filter((r) => s(r.umdNm) === sm.umd_nm && s(r.buildingUse) === sm.category && s(r.buildingType) === sm.kind).length;
      const sameJibun = sm.kind === "집합" ? bld.filter((r) => s(r.umdNm) === sm.umd_nm && s(r.jibun) === sm.jibun).length : null;
      result.push({ ...sm, sameJibun12m: sameJibun, sameDongSameUse12m: sameDongUse });
    }
  }

  // 지도: 집합 표본 주소로 주소→좌표, 첫 좌표로 정적 지도 1장(응답 형태만 기록)
  const { key, domain } = vworldAuthParams();
  const geo: Record<string, unknown>[] = [];
  let firstPoint: { x: string; y: string } | null = null;
  for (const sm of samples.filter((x) => x.kind === "집합").slice(0, 3)) {
    const address = `${sm.sgg_nm} ${sm.umd_nm} ${sm.jibun}`;
    const qs = new URLSearchParams({ service: "address", request: "getcoord", version: "2.0", crs: "epsg:4326", address, refine: "true", simple: "false", format: "json", type: "parcel", key, domain });
    const started = Date.now();
    try {
      const res = await fetch(`https://api.vworld.kr/req/address?${qs}`, { cache: "no-store" });
      const j = (await res.json().catch(() => null)) as { response?: { status?: string; error?: { text?: string }; result?: { point?: { x: string; y: string } } } } | null;
      const point = j?.response?.result?.point ?? null;
      if (point && !firstPoint) firstPoint = point;
      geo.push({ address, http: res.status, status: j?.response?.status, error: j?.response?.error?.text, point, ms: Date.now() - started });
    } catch (e) {
      geo.push({ address, error: e instanceof Error ? e.message : String(e) });
    }
  }
  let staticMap: Record<string, unknown> = { skipped: "좌표 없음" };
  if (firstPoint) {
    const qs = new URLSearchParams({ service: "image", request: "getmap", key, domain, center: `${firstPoint.x},${firstPoint.y}`, crs: "epsg:4326", zoom: "17", size: "600,360", format: "png", basemap: "GRAPHIC", marker: "on" });
    const started = Date.now();
    try {
      const res = await fetch(`https://api.vworld.kr/req/image?${qs}`, { cache: "no-store" });
      const type = res.headers.get("content-type") ?? "";
      const buf = Buffer.from(await res.arrayBuffer());
      staticMap = { http: res.status, contentType: type, bytes: buf.length, pngHeader: buf.subarray(1, 4).toString("latin1") === "PNG", textHead: type.includes("png") ? undefined : buf.subarray(0, 300).toString("utf8"), ms: Date.now() - started };
    } catch (e) {
      staticMap = { error: e instanceof Error ? e.message : String(e) };
    }
  }

  const of = (k: Sample["kind"]) => result.filter((r) => r.kind === k);
  const summary = {
    집합_같은지번2건이상: `${of("집합").filter((r) => (r.sameJibun12m as number) >= 2).length}/${of("집합").length}`,
    집합_같은동같은용도5건이상: `${of("집합").filter((r) => (r.sameDongSameUse12m as number) >= 5).length}/${of("집합").length}`,
    일반_같은동같은용도5건이상: `${of("일반").filter((r) => (r.sameDongSameUse12m as number) >= 5).length}/${of("일반").length}`,
    토지_같은동같은지목5건이상: `${of("토지").filter((r) => (r.sameDongSameJimok6m as number) >= 5).length}/${of("토지").length}`,
    주소좌표성공: `${geo.filter((g) => g.point).length}/${geo.length}`,
  };
  return NextResponse.json({ sggs, sampled: samples.length, calls, summary, result, geo, staticMap, errors: errors.slice(0, 10) });
}
