import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserApiKey } from "@/lib/apiKeys";
import { getTrendingVideos } from "@/lib/youtube/trendingVideos";
import type { TrendingParams } from "@/lib/youtube/types";
import { errorCode, errorMessage, errorStatus } from "@/lib/errors";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(request: Request) {
  try {
    const access = await checkProgramAccessApi();
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const user = access.user;

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

    const body: TrendingParams = await request.json();
    const videos = await getTrendingVideos(body, apiKey);
    return NextResponse.json({ items: videos });
  } catch (err: unknown) {
    console.error("trending error:", err);
    return NextResponse.json(
      { error: errorMessage(err) || "실시간 터진 영상 조회 중 오류가 발생했습니다.", code: errorCode(err) },
      { status: errorStatus(err) || 500 }
    );
  }
}
