import { NextResponse, type NextRequest } from "next/server";
import { requireAccess } from "@/lib/routeGuard";
import { getAmsSongs } from "@/lib/amsTracks";

// v1.27 AI 음악 스튜디오 곡 여러 개(?refs=<생성 번호>:<곡 순서>,… 최대 20곡)의 음악 서명 주소·제목·Lyria 시간 가사
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
const REF = /^([0-9a-f-]{36}):([0-9])$/i;
const NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET(request: NextRequest) {
  const g = await requireAccess(); if (g.error) return g.error;
  const refs = (request.nextUrl.searchParams.get("refs") ?? "")
    .split(",").map((x) => REF.exec(x.trim())).filter((m): m is RegExpExecArray => !!m)
    .map((m) => ({ id: m[1], index: Number(m[2]) })).slice(0, 20);
  if (!refs.length) return NextResponse.json({ error: "곡 번호가 올바르지 않습니다." }, { status: 400, headers: NO_STORE });
  try {
    return NextResponse.json({ songs: await getAmsSongs(g.user.id, refs) }, { headers: NO_STORE });
  } catch (e) {
    console.error("[playlist ams songs]", e instanceof Error ? e.message : "unknown");
    return NextResponse.json({ error: "곡을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500, headers: NO_STORE });
  }
}
