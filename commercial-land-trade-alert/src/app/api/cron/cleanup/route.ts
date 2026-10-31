import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 보관 기간 1년(주인님 지정 2026-10-31, docs/TOP_RULE_PERSONAL_ACCOUNT_API.md §8). 회원 기록은 거래 줄과 함께 지워진다.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });
  }
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10);
  const { error, count } = await admin.from("commercial_land_trades").delete({ count: "exact" }).lt("deal_date", cutoff);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: count ?? 0 });
}
