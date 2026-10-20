import { NextResponse, type NextRequest } from "next/server";
import { fail, guard, json } from "@/lib/route";
import { CONNECT_PROGRAMS, youtubeStateMessage, youtubeStatus } from "@/lib/youtube/account";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// v1.19 유튜브 연결 상태(공용 연결 계정). 토큰 값은 돌려주지 않는다
export async function GET(request: NextRequest) {
  try {
    const g = await guard(request); if (g instanceof NextResponse) return g;
    const s = await youtubeStatus(g.userId);
    return json({ ...s, message: youtubeStateMessage(s.state), connectPrograms: CONNECT_PROGRAMS });
  } catch (e) { return fail(e); }
}
