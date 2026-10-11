import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserApiKey } from "@/lib/apiKeys";
import { findGoldenChannels } from "@/lib/youtube/goldenChannels";
import type { GoldenChannelsParams } from "@/lib/youtube/types";

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
