import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getUserApiKey } from "@/lib/apiKeys";
import { searchViralShorts } from "@/lib/youtube/viralShorts";
import type { ShortsSearchParams } from "@/lib/youtube/types";

export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const apiKey = await getUserApiKey(user.id, "youtube_api_key");
    if (!apiKey) {
      return NextResponse.json(
        {
          error: "등록된 YouTube Data API v3 키가 없습니다. [설정 > YouTube API 키] 메뉴에서 본인의 API 키를 먼저 등록해주세요.",
          needApiKey: true,
        },
        { status: 400 }
      );
    }

    const body: ShortsSearchParams = await request.json();
    if (!body.keyword || body.keyword.trim().length === 0) {
      return NextResponse.json({ error: "검색어를 입력해주세요." }, { status: 400 });
    }

    const result = await searchViralShorts(body, apiKey);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("search-shorts error:", err);
    return NextResponse.json(
      { error: err.message || "영상 검색 중 오류가 발생했습니다.", code: err.code },
      { status: err.status || 500 }
    );
  }
}
