import { NextRequest, NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { pickPeriod } from "@/lib/youtube/analytics";
import { MyChannelError, loadMyChannel } from "@/lib/youtube/myChannel";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;

// V6 내 채널 진짜 지표 조회(v1.27): 연결 상태 + 기간별 지표. 회원 본인 토큰으로 바로 불러오고 저장하지 않는다.
export async function GET(request: NextRequest) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  try {
    const data = await loadMyChannel(access.user.id, pickPeriod(request.nextUrl.searchParams.get("days")));
    return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    if (e instanceof MyChannelError) return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "google" ? 502 : 400 });
    console.error("[my-channel] 조회 실패", e);
    return NextResponse.json({ error: "지표를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
}
