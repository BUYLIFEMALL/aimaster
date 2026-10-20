import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserApiKey } from "@/lib/apiKeys";
import { analyzeKeyword } from "@/lib/consultant/youtube/analysis";
import type { SearchOrder, SearchRegion } from "@/lib/consultant/youtube/types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const REGIONS: SearchRegion[] = ["all", "kr", "global"];
const ORDERS: SearchOrder[] = ["viewCount", "relevance", "date"];

export async function POST(request: Request) {
  try {
    const access = await checkProgramAccessApi();
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

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
    const region: SearchRegion = REGIONS.includes(body.region) ? body.region : "all";
    const order: SearchOrder = ORDERS.includes(body.order) ? body.order : "viewCount";
    const categoryId = typeof body.categoryId === "string" && /^\d{1,3}$/.test(body.categoryId) ? body.categoryId : undefined;
    const pages = Number(body.pages) === 2 ? 2 : 1;

    const result = await analyzeKeyword({ keyword, region, order, categoryId, pages }, apiKey);
    return NextResponse.json(result);
  } catch (err) {
    const e = err as { message?: string; code?: string; status?: number };
    console.error("keyword analysis error:", String(e.message ?? "").replace(/key=[^&\s]+/g, "key=***"));
    return NextResponse.json(
      { error: e.message?.replace(/key=[^&\s]+/g, "key=***") || "키워드 분석 중 오류가 발생했습니다.", code: e.code },
      { status: e.status || 500 }
    );
  }
}
