import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserApiKey } from "@/lib/apiKeys";
import { findShortsOriginalSource } from "@/lib/youtube/sourceFinder";

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

    const body = await request.json();
    const targetUrl = String(body.url || body.shortsUrl || "").trim();
    if (!targetUrl) {
      return NextResponse.json({ error: "쇼츠 URL 또는 영상 ID를 입력해주세요." }, { status: 400 });
    }

    const result = await findShortsOriginalSource(targetUrl, apiKey);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("source-finder error:", err);
    return NextResponse.json(
      { error: err.message || "쇼츠 원본 추적 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
