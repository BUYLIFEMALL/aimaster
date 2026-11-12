import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { bjdongCodeOf } from "@/lib/regions";
import { parseJibun, pickFloor } from "@/lib/trades/floor";
import { createProbe, ProbeStopped } from "@/lib/trades/floorProbe";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

const TIME_BUDGET_MS = 240_000; // Vercel 300초 안에서 응답을 돌려주기 위한 예산

// 관리자 전용 진단(2026-11-02 플랜 §2 4단계): 층이 빈 집합 거래 최근 30건을 건축물대장 전유부와 맞춰 본다.
// 수집에 넣기 전에 맞춤률만 잰다. DB는 읽기만 하고 고치지 않는다. 공공 실거래·건축물대장이라 회원 정보가 없다.
// 호출 조절(2026-11-12): 쪽 하나씩·간격 200ms, 429가 다시 나면 회차 멈춤(재시도·우회 안 함), 실패 지번 다시 안 부름, 3,000줄 넘는 지번은 따로 셈.
export async function GET(request: Request) {
  const started = Date.now();
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

  const probe = createProbe({ key, deadline: started + TIME_BUDGET_MS, fetcher: (url) => fetch(url, { cache: "no-store" }) });
  const tally = { found: 0, ambiguous: 0, none: 0, too_large: 0, skipped: 0, error: 0, not_tried: 0 };
  const rows: unknown[] = [];
  for (const t of (trades ?? []) as { sgg_cd: string; umd_nm: string; jibun: string; area_m2: number; deal_date: string; category: string }[]) {
    const code = bjdongCodeOf(t.sgg_cd, t.umd_nm);
    const lot = parseJibun(t.jibun);
    if (!code || !lot || !(Number(t.area_m2) > 0)) {
      tally.skipped++;
      rows.push({ ...t, result: "skipped", why: !code ? "법정동 코드 없음" : !lot ? "지번 형식" : "면적 없음" });
      continue;
    }
    if (probe.stopped) {
      tally.not_tried++;
      rows.push({ ...t, result: "not_tried", why: probe.stopped });
      continue;
    }
    try {
      const { items, total, tooLarge } = await probe.lot(t.sgg_cd, code.slice(5), lot.bun, lot.ji);
      if (tooLarge) {
        tally.too_large++;
        rows.push({ ...t, result: "too_large", total });
        continue;
      }
      const hit = pickFloor(items, Number(t.area_m2));
      const result = !hit ? "none" : "floor" in hit ? "found" : "ambiguous";
      tally[result]++;
      rows.push({ ...t, result, floor: hit && "floor" in hit ? hit.floor : null, floors: hit && "ambiguous" in hit ? hit.ambiguous : null, units: items.length, total });
    } catch (e) {
      // 다른 지번 때문에 멈춘 회차가 이 지번의 기억된 실패로 돌아온 경우가 아니면 오류로 센다
      const result = e instanceof ProbeStopped && e.reason === "time" ? "not_tried" : "error";
      tally[result]++;
      rows.push({ ...t, result, why: e instanceof Error ? e.message : "실패" });
    }
  }
  // 맞춤률 = 끝까지 읽어 판정한 거래(찾음·여러 층·없음) 중 찾음. 큰 지번·오류·시도 안 함은 분모에서 뺀다
  const judged = tally.found + tally.ambiguous + tally.none;
  return NextResponse.json({
    sampled: (trades ?? []).length,
    lots: probe.lotCount,
    calls: probe.calls,
    stoppedReason: probe.stopped,
    seconds: Math.round((Date.now() - started) / 1000),
    tally,
    matchRate: judged ? Math.round((tally.found / judged) * 100) : null,
    rows,
  });
}
