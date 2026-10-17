import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserApiKey } from "@/lib/apiKeys";
import { findTargetChannels } from "@/lib/youtube/analysis";
import { normalizeGoldenParams } from "@/lib/youtube/goldenEngine";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 이 프로그램의 기본 조건(입력이 비거나 잘못됐을 때)
const DEFAULTS = { maxSubscribers: 10_000, minAverageViews: 10_000, period: "90d", shortVideosOnly: false, region: "all", pages: 1 } as const;

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
    const params = normalizeGoldenParams(body ?? {}, DEFAULTS);
    if ("error" in params) {
      return NextResponse.json({ error: params.error }, { status: 400 });
    }

    const result = await findTargetChannels(params, apiKey);
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
