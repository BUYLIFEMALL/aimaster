import { NextResponse } from "next/server";
import { requireAccess } from "@/lib/routeGuard";
import { CONNECT_PROGRAMS, youtubeStateMessage, youtubeStatus } from "@/lib/youtube/account";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
const NO_STORE = { "Cache-Control": "private, no-store" };

// v1.22 유튜브 연결 상태(공용 연결 계정, 가사영상 v1.04에서 복사). 토큰 값은 돌려주지 않는다
export async function GET() {
  const g = await requireAccess(); if (g.error) return g.error;
  try {
    const s = await youtubeStatus(g.user.id);
    return NextResponse.json({ ...s, message: youtubeStateMessage(s.state), connectPrograms: CONNECT_PROGRAMS }, { headers: NO_STORE });
  } catch (e) {
    console.error("[playlist youtube status]", e instanceof Error ? e.message.slice(0, 200) : "unknown");
    return NextResponse.json({ error: "유튜브 연결 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500, headers: NO_STORE });
  }
}
