import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * 어필리에이트 클릭 추적 API
 * POST /api/affiliate/track
 * Body: { code, pageUrl }
 */
export async function POST(req: NextRequest) {
  try {
    const { code, pageUrl } = await req.json();

    if (!code) {
      return NextResponse.json({ error: "code 필요" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // 추천인 조회
    const { data: referrer } = await supabase
      .from("profiles")
      .select("id")
      .eq("affiliate_code", code)
      .single();

    if (!referrer) {
      return NextResponse.json({ error: "유효하지 않은 추천 코드" }, { status: 404 });
    }

    // IP, User-Agent 추출
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("x-real-ip")
      || "unknown";
    const userAgent = req.headers.get("user-agent") || "";

    // 클릭 기록 저장
    await supabase.from("affiliate_clicks").insert({
      affiliate_code: code,
      referrer_id: referrer.id,
      ip_address: ip,
      user_agent: userAgent,
      page_url: pageUrl || null,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Affiliate Track]", err);
    return NextResponse.json({ error: "추적 실패" }, { status: 500 });
  }
}

/**
 * 어필리에이트 통계 조회 API (본인 클릭 통계)
 * GET /api/affiliate/track
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createServiceClient();

    const code = req.nextUrl.searchParams.get("code");
    if (!code) {
      return NextResponse.json({ error: "code 필요" }, { status: 400 });
    }

    // 추천인 확인
    const { data: referrer } = await supabase
      .from("profiles")
      .select("id")
      .eq("affiliate_code", code)
      .single();

    if (!referrer) {
      return NextResponse.json({ error: "유효하지 않은 코드" }, { status: 404 });
    }

    // 전체 클릭수
    const { count: totalClicks } = await supabase
      .from("affiliate_clicks")
      .select("*", { count: "exact", head: true })
      .eq("referrer_id", referrer.id);

    // 오늘 클릭수
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: todayClicks } = await supabase
      .from("affiliate_clicks")
      .select("*", { count: "exact", head: true })
      .eq("referrer_id", referrer.id)
      .gte("created_at", today.toISOString());

    // 최근 7일 일별 클릭수
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { data: recentClicks } = await supabase
      .from("affiliate_clicks")
      .select("created_at")
      .eq("referrer_id", referrer.id)
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: true });

    // 일별 집계
    const dailyMap: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dailyMap[d.toISOString().slice(0, 10)] = 0;
    }
    recentClicks?.forEach((c) => {
      const day = new Date(c.created_at).toISOString().slice(0, 10);
      if (dailyMap[day] !== undefined) dailyMap[day]++;
    });

    const daily = Object.entries(dailyMap).map(([date, clicks]) => ({ date, clicks }));

    // 추천 가입자 수
    const { count: referralCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("referred_by", referrer.id);

    return NextResponse.json({
      totalClicks: totalClicks ?? 0,
      todayClicks: todayClicks ?? 0,
      daily,
      referralCount: referralCount ?? 0,
    });
  } catch (err) {
    console.error("[Affiliate Stats]", err);
    return NextResponse.json({ error: "통계 조회 실패" }, { status: 500 });
  }
}
