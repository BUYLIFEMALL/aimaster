import { NextResponse, type NextRequest } from "next/server";
import { requireAccess } from "@/lib/routeGuard";
import { SunoError, getSunoVariant, listSunoTracks } from "@/lib/sunoTracks";

// v1.19 음악(SUNO) 자동화의 내 곡 목록(?variant= 이면 그 변주의 음악 서명 주소)
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
const UUID = /^[0-9a-f-]{36}$/i;
const NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET(request: NextRequest) {
  const g = await requireAccess(); if (g.error) return g.error;
  try {
    const variant = request.nextUrl.searchParams.get("variant");
    if (variant) {
      if (!UUID.test(variant)) return NextResponse.json({ error: "곡 번호가 올바르지 않습니다." }, { status: 400, headers: NO_STORE });
      return NextResponse.json({ variant: await getSunoVariant(g.user.id, variant) }, { headers: NO_STORE });
    }
    return NextResponse.json({ tracks: await listSunoTracks(g.user.id) }, { headers: NO_STORE });
  } catch (e) {
    if (e instanceof SunoError) return NextResponse.json({ error: e.message }, { status: e.status, headers: NO_STORE });
    console.error("[playlist suno tracks]", e instanceof Error ? e.message : "unknown");
    return NextResponse.json({ error: "곡 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500, headers: NO_STORE });
  }
}
