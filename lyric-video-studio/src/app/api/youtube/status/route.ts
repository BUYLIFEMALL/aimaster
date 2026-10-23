import { NextResponse, type NextRequest } from "next/server";
import { fail, guard, json } from "@/lib/route";
import { CONNECT_PROGRAMS, listYoutubeChannels, youtubeStateMessage, youtubeStatus } from "@/lib/youtube/account";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// v1.04 유튜브 연결 상태(공용 연결 계정, shorts-onestop-studio에서 복사). 토큰 값은 돌려주지 않는다
// v1.08 ?account=<연결 계정 번호> — 채널이 여러 개면 고른 채널 상태(회원 본인 채널 안에서만 찾음)
const UUID = /^[0-9a-f-]{36}$/i;
export async function GET(request: NextRequest) {
  try {
    const g = await guard(request); if (g instanceof NextResponse) return g;
    const pick = request.nextUrl.searchParams.get("account");
    const channels = await listYoutubeChannels(g.userId);
    const accountId = pick && UUID.test(pick) && channels.some((c) => c.id === pick) ? pick : channels[0]?.id ?? null;
    const s = await youtubeStatus(g.userId, accountId);
    return json({ ...s, message: youtubeStateMessage(s.state), connectPrograms: CONNECT_PROGRAMS, channels, accountId });
  } catch (e) { return fail(e); }
}
