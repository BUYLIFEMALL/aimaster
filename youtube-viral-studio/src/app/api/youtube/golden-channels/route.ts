import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getUserApiKey } from "@/lib/apiKeys";
import { findGoldenChannels } from "@/lib/youtube/goldenChannels";
import type { GoldenChannelsParams } from "@/lib/youtube/types";

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

    const body: GoldenChannelsParams = await request.json();
    const channels = await findGoldenChannels(body, apiKey);
    return NextResponse.json({ items: channels });
  } catch (err: any) {
    console.error("golden-channels error:", err);
    return NextResponse.json(
      { error: err.message || "황금 채널 발굴 중 오류가 발생했습니다.", code: err.code },
      { status: err.status || 500 }
    );
  }
}
