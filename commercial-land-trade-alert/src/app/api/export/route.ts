import { NextRequest, NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { normalizePrefs, kindLabel } from "@/lib/trades/prefs";
import { applyTradeFilter } from "@/lib/trades/query";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const cell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  // 엑셀이 수식으로 실행하지 않도록 앞에 작은따옴표를 붙인다
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

export async function GET(request: NextRequest) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const supabase = await createClient();
  const sp = request.nextUrl.searchParams;
  const [{ data: watches }, { data: prefRow }] = await Promise.all([
    supabase.from("commercial_land_watch").select("sgg_cd").eq("user_id", access.userId).eq("is_active", true),
    supabase.from("commercial_land_preferences").select("*").eq("user_id", access.userId).maybeSingle(),
  ]);
  const codes = ((watches ?? []) as { sgg_cd: string }[]).map((w) => w.sgg_cd);
  const filter = { kind: sp.get("kind") ?? "", sgg: sp.get("sgg") ?? "", q: sp.get("q") ?? "", category: sp.get("category") ?? "", mine: sp.get("mine") !== "0", sort: sp.get("sort") ?? "" };
  const { data, error } = await applyTradeFilter(supabase.from("commercial_land_trades").select("*"), filter, codes, normalizePrefs(prefRow)).limit(5000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const head = ["계약일", "종류", "시군구", "읍면동", "지번(일부 가림)", "분류", "일반/집합", "용도지역", "금액(만원)", "면적(㎡)", "대지면적(㎡)", "평당가(만원)", "층", "건축년도", "지분", "거래방식", "취소"];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = ((data ?? []) as any[]).map((t) =>
    [t.deal_date, kindLabel(t.kind), t.sgg_nm, t.umd_nm, t.jibun, t.category, t.building_type, t.land_use, t.amount_manwon, t.area_m2, t.plot_m2, t.price_per_pyeong, t.floor, t.build_year, t.is_share ? "지분" : "", t.dealing_type, t.cancelled ? `취소 ${t.cancelled_on ?? ""}` : ""].map(cell).join(","),
  );
  return new NextResponse(`﻿${head.map(cell).join(",")}\r\n${rows.join("\r\n")}`, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="commercial-land-trades.csv"` },
  });
}
