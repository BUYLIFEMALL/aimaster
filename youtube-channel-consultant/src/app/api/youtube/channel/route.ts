import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserApiKey } from "@/lib/apiKeys";
import { analyzeChannel } from "@/lib/youtube/analysis";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const ALLOWED_LIMITS = [50, 100, 200];

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
    const query = typeof body.query === "string" ? body.query.trim() : "";
    if (!query || query.length > 200) {
      return NextResponse.json({ error: "채널 이름·@핸들·채널 주소를 입력해주세요." }, { status: 400 });
    }
    const limit = ALLOWED_LIMITS.includes(Number(body.videoLimit)) ? Number(body.videoLimit) : 50;

    const result = await analyzeChannel(query, limit, apiKey);
    return NextResponse.json(result);
  } catch (err) {
    const e = err as { message?: string; code?: string; status?: number };
    // 키가 로그에 남지 않도록 메시지의 key 파라미터를 가린다.
    console.error("channel analysis error:", String(e.message ?? "").replace(/key=[^&\s]+/g, "key=***"));
    return NextResponse.json(
      { error: e.message?.replace(/key=[^&\s]+/g, "key=***") || "채널 분석 중 오류가 발생했습니다.", code: e.code },
      { status: e.status || 500 }
    );
  }
}
