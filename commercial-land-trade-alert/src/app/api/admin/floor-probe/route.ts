import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { bjdongCodeOf } from "@/lib/regions";
import { parseJibun, pickFloor, type ExposItem } from "@/lib/trades/floor";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

const HUB = "https://apis.data.go.kr/1613000/BldRgstHubService/getBrExposPubuseAreaInfo";
// 이 API는 numOfRows를 1000으로 줘도 한 쪽에 100줄만 준다(2026-11-02 첫 측정: units 100 / total 최대 21,183). 그래서 쪽을 넘겨 다 읽는다.
const PAGE_ROWS = 100;
const MAX_PAGES = 120; // 지번 하나에 1만 2천 줄까지(대형 집합상가는 넘을 수 있어 그때는 truncated로 표시)

type LotUnits = { items: ExposItem[]; total: number; truncated: boolean };

async function fetchLot(key: string, sggCd: string, bjdongCd: string, bun: string, ji: string): Promise<LotUnits> {
  const page = async (n: number) => {
    const qs = new URLSearchParams({ serviceKey: key, sigunguCd: sggCd, bjdongCd, platGbCd: "0", bun, ji, _type: "json", numOfRows: String(PAGE_ROWS), pageNo: String(n) });
    for (let attempt = 0; ; attempt++) {
      const res = await fetch(`${HUB}?${qs}`, { cache: "no-store" }).catch(() => null);
      if (res?.ok) {
        const body = await res.json();
        const raw = body?.response?.body?.items?.item ?? [];
        return { items: (Array.isArray(raw) ? raw : [raw]) as ExposItem[], total: Number(body?.response?.body?.totalCount ?? 0) };
      }
      if (attempt >= 2) throw new Error(`HTTP ${res?.status ?? "연결 실패"}`);
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  };
  const first = await page(1);
  const pages = Math.min(Math.ceil(first.total / PAGE_ROWS), MAX_PAGES);
  const items = [...first.items];
  // 5쪽씩 나눠 받는다(공공데이터포털 초당 호출 제한)
  for (let n = 2; n <= pages; n += 5) {
    const batch = await Promise.all(Array.from({ length: Math.min(5, pages - n + 1) }, (_, i) => page(n + i)));
    for (const b of batch) items.push(...b.items);
  }
  return { items, total: first.total, truncated: Math.ceil(first.total / PAGE_ROWS) > MAX_PAGES };
}

// 관리자 전용 진단(2026-11-02 플랜 §2 4단계): 층이 빈 집합 거래 최근 30건을 건축물대장 전유부와 맞춰 본다.
// 수집에 넣기 전에 맞춤률만 잰다. DB는 읽기만 하고 고치지 않는다. 공공 실거래·건축물대장이라 회원 정보가 없다.
export async function GET(request: Request) {
  const user = await getSessionUser();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const { data: profile } = await db.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!profile?.is_admin) return NextResponse.json({ error: "관리자만 볼 수 있습니다." }, { status: 403 });
  const key = process.env.DATA_GO_KR_SERVICE_KEY;
  if (!key) return NextResponse.json({ error: "DATA_GO_KR_SERVICE_KEY가 없습니다." }, { status: 500 });

  const limit = Math.min(Number(new URL(request.url).searchParams.get("n")) || 30, 50);
  const { data: trades } = await db
    .from("commercial_land_trades")
    .select("sgg_cd, umd_nm, jibun, area_m2, deal_date, category")
    .eq("kind", "building")
    .eq("building_type", "집합")
    .eq("jibun_masked", false)
    .or("floor.is.null,floor.eq.")
    .order("deal_date", { ascending: false })
    .limit(limit);

  const tally = { found: 0, ambiguous: 0, none: 0, skipped: 0, error: 0 };
  const rows: unknown[] = [];
  const lots = new Map<string, Promise<LotUnits>>(); // 같은 지번은 한 번만 읽는다
  let calls = 0;
  for (const t of (trades ?? []) as { sgg_cd: string; umd_nm: string; jibun: string; area_m2: number; deal_date: string; category: string }[]) {
    const code = bjdongCodeOf(t.sgg_cd, t.umd_nm);
    const lot = parseJibun(t.jibun);
    if (!code || !lot || !(Number(t.area_m2) > 0)) {
      tally.skipped++;
      rows.push({ ...t, result: "skipped", why: !code ? "법정동 코드 없음" : !lot ? "지번 형식" : "면적 없음" });
      continue;
    }
    const lotKey = `${t.sgg_cd}|${code}|${lot.bun}|${lot.ji}`;
    try {
      if (!lots.has(lotKey)) lots.set(lotKey, fetchLot(key, t.sgg_cd, code.slice(5), lot.bun, lot.ji));
      const { items, total, truncated } = await lots.get(lotKey)!;
      calls += Math.min(Math.ceil(total / PAGE_ROWS), MAX_PAGES) || 1;
      const hit = pickFloor(items, Number(t.area_m2));
      const result = !hit ? "none" : "floor" in hit ? "found" : "ambiguous";
      tally[result]++;
      rows.push({ ...t, result, floor: hit && "floor" in hit ? hit.floor : null, floors: hit && "ambiguous" in hit ? hit.ambiguous : null, units: items.length, total, truncated });
    } catch (e) {
      lots.delete(lotKey);
      tally.error++;
      rows.push({ ...t, result: "error", why: e instanceof Error ? e.message : "실패" });
    }
  }
  const tried = (trades ?? []).length - tally.skipped;
  return NextResponse.json({ sampled: (trades ?? []).length, lots: lots.size, calls, tally, matchRate: tried ? Math.round((tally.found / tried) * 100) : null, rows });
}
