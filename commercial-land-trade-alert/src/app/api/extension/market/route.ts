import { NextResponse } from "next/server";
import { verifyExtensionToken } from "@/lib/extensionAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { dongOf } from "@/lib/regions";
import { summarizeMarket, type MarketRow } from "@/lib/trades/market";
import { daysAgoIso } from "@/lib/trades/parse";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 확장이 동 코드만 보내 그 동의 실거래 시세를 받는다. 매물 내용은 받지 않는다.
// 아직 수집하지 않는 지역이면 이 회원의 관심 지역에 넣어 다음 수집부터 자료를 채운다.
export async function POST(request: Request) {
  const user = await verifyExtensionToken(request);
  if (!user) return NextResponse.json({ error: "유효하지 않은 연결 코드이거나 이용 권한이 없습니다." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { cortarNos?: unknown } | null;
  const codes = Array.isArray(body?.cortarNos) ? body.cortarNos.map(String).filter((c) => /^\d{10}$/.test(c)).slice(0, 10) : [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;
  const since = daysAgoIso(365).slice(0, 10);
  const markets: Record<string, unknown> = {};
  for (const code of new Set(codes)) {
    const found = dongOf(code);
    if (!found) {
      markets[code] = { unknown: true };
      continue;
    }
    const { data: state } = await db.from("commercial_land_region_state").select("first_collected_at").eq("sgg_cd", found.sggCd).maybeSingle();
    if (!state?.first_collected_at) {
      await db.from("commercial_land_watch").upsert({ user_id: user.userId, sgg_cd: found.sggCd, sgg_nm: found.sggNm, is_active: true }, { onConflict: "user_id,sgg_cd", ignoreDuplicates: true });
    }
    const { data } = await db
      .from("commercial_land_trades")
      .select("kind, building_type, category, umd_nm, price_per_pyeong, is_share, cancelled")
      .eq("sgg_cd", found.sggCd)
      .gte("deal_date", since)
      .limit(5000);
    markets[code] = { name: `${found.sggNm} ${found.dong}`, collecting: !state?.first_collected_at, ...summarizeMarket((data ?? []) as MarketRow[], found.dong) };
  }
  return NextResponse.json({ markets });
}
