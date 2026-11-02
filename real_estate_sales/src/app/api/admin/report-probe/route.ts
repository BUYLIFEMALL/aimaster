import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchApartAssessedPrice, fetchBuildingTitle } from "@/lib/publicdata/client";
import { pickAssessedPrice } from "@/lib/publicdata/molit";
import { ensureLandInfo } from "@/lib/realestate/collect";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

// B0 사전 검증(2026-11-02 주인님 「진행해」, 플랜 docs/PLAN_20261102_B_ADDRESS_REPORT.md): 주소 리포트 칸이 표본에서 얼마나 채워지는지 잰다.
// 관리자 전용·읽기 위주(공시지가 캐시 real_estate_land_info만 기존처럼 채워짐). 공공 자료라 회원 정보 없음. 운영자 공공 무료 키(예외 §8).
const QUOTA: Record<string, number> = { 아파트: 8, 빌라: 6, 오피스텔: 6 };
const FIELDS = ["사용승인일", "용적률", "건폐율", "주차", "공시가격", "개별공시지가", "용도지역", "같은 단지 매매 3건+", "같은 단지 전세"] as const;

type Sample = { kind: string; source: string; pnu: string; sgg: string; dong: string; name: string; area: number | null; floor: string | null };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = { from: (t: string) => any };

export async function GET() {
  const { data: auth } = await (await createClient()).auth.getUser();
  const db = createAdminClient() as unknown as Loose;
  if (!auth.user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const { data: profile } = await db.from("profiles").select("is_admin").eq("id", auth.user.id).maybeSingle();
  if (!profile?.is_admin) return NextResponse.json({ error: "관리자만 볼 수 있습니다." }, { status: 403 });

  // 표본: 유형별 최근 매매 중 서로 다른 필지, 그리고 지번이 붙은 임장 기록 최대 3곳
  const samples: Sample[] = [];
  for (const [kind, n] of Object.entries(QUOTA)) {
    const { data } = await db
      .from("real_estate_listings")
      .select("pnu, sgg_cd, stdg_nm, bldg_nm, exclusive_area, floor")
      .eq("deal_type", "매매")
      .eq("property_type", kind)
      .not("pnu", "is", null)
      .order("contract_date", { ascending: false })
      .limit(400);
    const seen = new Set<string>();
    for (const r of (data ?? []) as { pnu: string; sgg_cd: string; stdg_nm: string; bldg_nm: string; exclusive_area: number | null; floor: string | null }[]) {
      if (!/^\d{19}$/.test(r.pnu) || seen.has(r.pnu)) continue;
      seen.add(r.pnu);
      samples.push({ kind, source: "실거래", pnu: r.pnu, sgg: r.sgg_cd, dong: r.stdg_nm, name: r.bldg_nm, area: r.exclusive_area, floor: r.floor });
      if (seen.size >= n) break;
    }
  }
  const { data: onsite } = await db.from("real_estate_onsite_properties").select("pnu, kind").not("pnu", "is", null).limit(3);
  for (const r of (onsite ?? []) as { pnu: string; kind: string | null }[]) samples.push({ kind: r.kind ?? "임장", source: "임장", pnu: r.pnu, sgg: r.pnu.slice(0, 5), dong: "", name: "", area: null, floor: null });

  const year = new Date().getFullYear();
  const since = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10);
  const rows: Record<string, unknown>[] = [];
  const filled: Record<string, number> = Object.fromEntries(FIELDS.map((f) => [f, 0]));
  for (const s of samples) {
    const lot = { sigunguCd: s.pnu.slice(0, 5), bjdongCd: s.pnu.slice(5, 10), bun: s.pnu.slice(11, 15), ji: s.pnu.slice(15, 19) };
    const got: Record<string, unknown> = {};
    const errors: string[] = [];
    try {
      const titles = await fetchBuildingTitle(lot);
      const pick = (k: string) => titles.map((t) => t[k]).find((v) => v !== undefined && v !== null && String(v).trim() !== "" && String(v) !== "0");
      got["사용승인일"] = pick("useAprDay");
      got["용적률"] = pick("vlRat");
      got["건폐율"] = pick("bcRat");
      const parking = titles.reduce((n, t) => n + ["indrAutoUtcnt", "oudrAutoUtcnt", "indrMechUtcnt", "oudrMechUtcnt"].reduce((m, k) => m + (Number(t[k]) || 0), 0), 0);
      got["주차"] = parking || undefined;
    } catch (e) {
      errors.push(`표제부: ${e instanceof Error ? e.message : e}`);
    }
    if (s.kind !== "오피스텔") {
      try {
        const prices = await fetchApartAssessedPrice({ pnu: s.pnu, stdrYear: year - 1, numOfRows: 1000 });
        got["공시가격"] = s.area ? pickAssessedPrice(prices, String(s.area), s.floor ?? "") ?? undefined : prices.length || undefined;
      } catch (e) {
        errors.push(`공시가: ${e instanceof Error ? e.message : e}`);
      }
    } else got["공시가격"] = "대상 아님";
    const land = await ensureLandInfo(s.pnu).catch(() => null);
    got["개별공시지가"] = land?.pricePerM2 ?? undefined;
    got["용도지역"] = land?.useZones ?? undefined;
    if (s.name) {
      const same = (deal: string) => db.from("real_estate_listings").select("id", { count: "exact", head: true }).eq("sgg_cd", s.sgg).eq("stdg_nm", s.dong).eq("bldg_nm", s.name).eq("deal_type", deal).gte("contract_date", since);
      const [{ count: sale }, { count: jeonse }] = await Promise.all([same("매매"), same("전세")]);
      got["같은 단지 매매 3건+"] = (sale ?? 0) >= 3 ? sale : undefined;
      got["같은 단지 전세"] = jeonse || undefined;
    }
    let n = 0;
    for (const f of FIELDS) {
      const ok = got[f] !== undefined && got[f] !== null && got[f] !== "";
      if (ok) { filled[f]++; n++; }
    }
    rows.push({ kind: s.kind, source: s.source, name: s.name, dong: s.dong, fill: `${n}/${FIELDS.length}`, ...got, errors });
  }
  const total = samples.length;
  const rate = Object.fromEntries(FIELDS.map((f) => [f, total ? Math.round((filled[f] / total) * 100) : 0]));
  const overall = total ? Math.round((Object.values(filled).reduce((a, b) => a + b, 0) / (total * FIELDS.length)) * 100) : 0;
  return NextResponse.json({ sampled: total, overall, rate, rows });
}
