import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserApiKey } from "@/lib/apiKeys";
import { findTargetChannels } from "@/lib/youtube/analysis";
import type { SearchRegion, TargetPeriod } from "@/lib/youtube/types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const REGIONS: SearchRegion[] = ["all", "kr", "global"];
const PERIODS: TargetPeriod[] = ["30d", "90d", "365d"];

function boundedInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : NaN;
  return Number.isNaN(n) ? fallback : Math.min(max, Math.max(min, n));
}

export async function POST(request: Request) {
  try {
    const access = await checkProgramAccessApi();
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    // 최상위 규칙: 로그인한 회원 본인 키만 사용한다(폴백 없음).
    const apiKey = await getUserApiKey(access.user.id, "youtube_api_key");
    if (!apiKey) {
      return NextResponse.json(
        { error: "등록된 YouTube Data API v3 키가 없습니다. [API키등록·플랫폼연동]에서 본인 키를 먼저 등록해주세요.", needApiKey: true },
        { status: 400 }
      );
    }

    const body = await request.json();
    const keyword = typeof body.keyword === "string" ? body.keyword.trim() : "";
    if (!keyword || keyword.length > 100) {
      return NextResponse.json({ error: "검색 키워드를 100자 이내로 입력해주세요." }, { status: 400 });
    }

    const result = await findTargetChannels(
      {
        keyword,
        maxSubscribers: boundedInt(body.maxSubscribers, 100, 10_000_000, 10_000),
        minAverageViews: boundedInt(body.minAverageViews, 0, 100_000_000, 10_000),
        period: PERIODS.includes(body.period) ? body.period : "90d",
        shortVideosOnly: body.shortVideosOnly === true,
        region: REGIONS.includes(body.region) ? body.region : "all",
        pages: Number(body.pages) === 2 ? 2 : 1,
      },
      apiKey
    );
    return NextResponse.json(result);
  } catch (err) {
    const e = err as { message?: string; code?: string; status?: number };
    console.error("golden channels error:", String(e.message ?? "").replace(/key=[^&\s]+/g, "key=***"));
    return NextResponse.json(
      { error: e.message?.replace(/key=[^&\s]+/g, "key=***") || "공략 채널 검색 중 오류가 발생했습니다.", code: e.code },
      { status: e.status || 500 }
    );
  }
}
