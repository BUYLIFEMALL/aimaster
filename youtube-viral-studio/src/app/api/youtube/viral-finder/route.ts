import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserApiKey } from "@/lib/apiKeys";
import { computeMarketAnalytics, type FinderFormat } from "@/lib/youtube/boks/core";
import { computeTrends } from "@/lib/youtube/boks/trends";
import { remainingSearch } from "@/lib/youtube/boks/quota";
import { FinderContext, FinderError, fetchPopularChart, loadUsage, recordUsage, searchYouTube } from "@/lib/youtube/boks/search";
import { YouTubeDataError } from "@/lib/youtube/youtubeData";

// 떡상 시장 탐색(boks-youtube-finder 이식, v1.30) — 키워드 검색 / 인기 차트 + 평소 대비 판정·기회 지수·트렌드.
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 120;

const FORMATS: FinderFormat[] = ["all", "long", "shorts"];
const PERIODS = ["all", "24h", "3d", "7d", "30d", "90d", "1y", "custom"];
const REGIONS = ["KR", "US", "JP", "GB", "IN", "VN", "TW", "ALL"];
const LANGS = ["ko", "en", "ja", "zh", "vi", "th", "hi", "ALL"];

const NO_KEY = { error: "등록된 YouTube Data API v3 키가 없습니다. [API키등록·플랫폼연동]에서 본인 키를 먼저 등록해주세요.", needApiKey: true };

function pick<T extends string>(v: unknown, list: readonly T[], fallback: T): T {
  return typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : fallback;
}

/** 오늘 사용량(검색 전 표시용) */
export async function GET() {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const apiKey = await getUserApiKey(access.user.id, "youtube_api_key");
  if (!apiKey) return NextResponse.json(NO_KEY, { status: 400 });
  const ctx = new FinderContext(access.user.id, apiKey);
  return NextResponse.json({ usage: await loadUsage(access.user.id, ctx.keyHash) });
}

export async function POST(request: Request) {
  try {
    const access = await checkProgramAccessApi();
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });

    // 최상위 규칙: 로그인한 회원 본인 키만(폴백 없음)
    const apiKey = await getUserApiKey(access.user.id, "youtube_api_key");
    if (!apiKey) return NextResponse.json(NO_KEY, { status: 400 });

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const mode = body.mode === "chart" ? "chart" : "search";
    const query = typeof body.query === "string" ? body.query.trim().slice(0, 100) : "";
    const format = pick(body.format, FORMATS, "all");
    const regionCode = pick(body.regionCode, REGIONS, "KR");
    const relevanceLanguage = pick(body.relevanceLanguage, LANGS, "ko");
    const langOnly = body.langOnly !== false;
    const includeReligion = body.includeReligion === true;
    const videoCategoryId = typeof body.categoryId === "string" && /^\d{1,3}$/.test(body.categoryId) ? body.categoryId : "0";
    const publishedPeriod = pick(body.period, PERIODS, "all");
    const customRange = { from: typeof body.from === "string" ? body.from : "", to: typeof body.to === "string" ? body.to : "" };
    const order = body.order === "relevance" ? "relevance" : "viewCount";

    const ctx = new FinderContext(access.user.id, apiKey);
    const before = await loadUsage(access.user.id, ctx.keyHash);

    let result;
    try {
      result = mode === "chart"
        ? await fetchPopularChart(ctx, { regionCode, videoCategoryId, format, relevanceLanguage, langOnly, includeReligion })
        : await searchYouTube(ctx, {
          query, regionCode, relevanceLanguage, langOnly, videoCategoryId, publishedPeriod, customRange, format, order, includeReligion,
          maxSearchCalls: before.tracked ? remainingSearch(before) : undefined,
        });
    } finally {
      await recordUsage(ctx);
    }

    const market = computeMarketAnalytics(result.videos, mode === "chart" ? "" : query);
    const trends = computeTrends(result.videos, result.format);
    const usage = await loadUsage(access.user.id, ctx.keyHash);
    return NextResponse.json({ mode, query, ...result, market, trends, usage, fetchedAt: new Date().toISOString() });
  } catch (err) {
    if (err instanceof FinderError || err instanceof YouTubeDataError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status || 400 });
    }
    console.error("viral-finder error:", String((err as Error)?.message ?? "").replace(/key=[^&\s]+/g, "key=***").slice(0, 200));
    return NextResponse.json({ error: "떡상 탐색 중 오류가 발생했습니다. 잠시 뒤 다시 시도해주세요." }, { status: 500 });
  }
}
