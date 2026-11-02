import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { bjdongCodeOf } from "@/lib/regions";
import { parseJibun, pickFloor, type ExposItem } from "@/lib/trades/floor";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 120;

const HUB = "https://apis.data.go.kr/1613000/BldRgstHubService/getBrExposPubuseAreaInfo";

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
  for (const t of (trades ?? []) as { sgg_cd: string; umd_nm: string; jibun: string; area_m2: number; deal_date: string; category: string }[]) {
    const code = bjdongCodeOf(t.sgg_cd, t.umd_nm);
    const lot = parseJibun(t.jibun);
    if (!code || !lot || !(Number(t.area_m2) > 0)) {
      tally.skipped++;
      rows.push({ ...t, result: "skipped", why: !code ? "법정동 코드 없음" : !lot ? "지번 형식" : "면적 없음" });
      continue;
    }
    const qs = new URLSearchParams({ serviceKey: key, sigunguCd: t.sgg_cd, bjdongCd: code.slice(5), platGbCd: "0", bun: lot.bun, ji: lot.ji, _type: "json", numOfRows: "1000", pageNo: "1" });
    try {
      const res = await fetch(`${HUB}?${qs}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      const raw = body?.response?.body?.items?.item ?? [];
      const items: ExposItem[] = Array.isArray(raw) ? raw : [raw];
      const hit = pickFloor(items, Number(t.area_m2));
      const result = !hit ? "none" : "floor" in hit ? "found" : "ambiguous";
      tally[result]++;
      rows.push({ ...t, result, floor: hit && "floor" in hit ? hit.floor : null, floors: hit && "ambiguous" in hit ? hit.ambiguous : null, units: items.length, total: Number(body?.response?.body?.totalCount ?? 0) });
    } catch (e) {
      tally.error++;
      rows.push({ ...t, result: "error", why: e instanceof Error ? e.message : "실패" });
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  const tried = (trades ?? []).length - tally.skipped;
  return NextResponse.json({ sampled: (trades ?? []).length, tally, matchRate: tried ? Math.round((tally.found / tried) * 100) : null, rows });
}
