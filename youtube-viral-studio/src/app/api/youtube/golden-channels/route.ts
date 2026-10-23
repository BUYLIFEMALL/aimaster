import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserApiKey } from "@/lib/apiKeys";
import { findGoldenChannels } from "@/lib/youtube/goldenChannels";
import { normalizeGoldenParams } from "@/lib/youtube/goldenEngine";
import { errorCode, errorMessage, errorStatus } from "@/lib/errors";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 이 프로그램의 기본 조건 — 예전 동작과 같게(최근 30일·쇼츠·구독자 1만 이하·평균 3만 이상)
const DEFAULTS = { maxSubscribers: 10_000, minAverageViews: 30_000, period: "30d", shortVideosOnly: true, region: "all", pages: 1 } as const;

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
    const params = normalizeGoldenParams(body ?? {}, DEFAULTS);
    if ("error" in params) {
      return NextResponse.json({ error: params.error }, { status: 400 });
    }
    const result = await findGoldenChannels(params, apiKey);
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("golden-channels error:", err);
    return NextResponse.json(
      { error: errorMessage(err) || "황금 채널 발굴 중 오류가 발생했습니다.", code: errorCode(err) },
      { status: errorStatus(err) || 500 }
    );
  }
}
