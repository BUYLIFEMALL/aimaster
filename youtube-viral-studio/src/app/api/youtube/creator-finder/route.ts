import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserApiKey } from "@/lib/apiKeys";
import { youtubeCall } from "@/lib/youtube/client";
import { findCreators, normalizeCreatorParams } from "@/lib/youtube/creatorFinder";
import { errorCode, errorMessage, errorStatus } from "@/lib/errors";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/**
 * 협업 크리에이터 찾기(A4, 2026-11-10) — 회원 본인 YouTube 키로 공식 API만 부른다.
 * 결과는 저장하지 않는다(화면·CSV만, 주인님 결정 2). 공개 연락처 사용 책임 확인(agreed)이 있어야 실행한다.
 */
export async function POST(request: Request) {
  try {
    const access = await checkProgramAccessApi();
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const user = access.user;

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (body?.agreed !== true) {
      return NextResponse.json({ error: "공개 연락처 사용 안내를 읽고 동의해 주세요.", needAgree: true }, { status: 400 });
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

    const params = normalizeCreatorParams(body);
    if ("error" in params) {
      return NextResponse.json({ error: params.error }, { status: 400 });
    }
    const result = await findCreators(params, (endpoint, query) => youtubeCall(endpoint, query, apiKey));
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("creator-finder error:", err);
    return NextResponse.json(
      { error: errorMessage(err) || "협업 크리에이터 찾기 중 오류가 발생했습니다.", code: errorCode(err) },
      { status: errorStatus(err) || 500 }
    );
  }
}
