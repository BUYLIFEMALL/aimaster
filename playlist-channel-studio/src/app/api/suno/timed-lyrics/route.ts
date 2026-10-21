import { NextResponse, type NextRequest } from "next/server";
import { requireAccess } from "@/lib/routeGuard";
import { SunoError, fetchSunoTimedLines } from "@/lib/sunoTracks";

// v1.19 회원 본인 Suno 키로 시간 가사를 받아 줄 시간표로 돌려준다(곡마다 1회)
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;
const UUID = /^[0-9a-f-]{36}$/i;
const NO_STORE = { "Cache-Control": "private, no-store" };

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "요청 출처를 확인할 수 없습니다." }, { status: 403, headers: NO_STORE });
  const g = await requireAccess(); if (g.error) return g.error;
  try {
    const body = (await request.json().catch(() => ({}))) as { variantId?: unknown };
    const variantId = String(body.variantId ?? "");
    if (!UUID.test(variantId)) return NextResponse.json({ error: "곡 번호가 올바르지 않습니다." }, { status: 400, headers: NO_STORE });
    return NextResponse.json({ lines: await fetchSunoTimedLines(g.user.id, variantId) }, { headers: NO_STORE });
  } catch (e) {
    if (e instanceof SunoError) return NextResponse.json({ error: e.message, needSunoKey: e.needSunoKey }, { status: e.status, headers: NO_STORE });
    console.error("[playlist suno timed]", e instanceof Error ? e.message : "unknown");
    return NextResponse.json({ error: "시간 가사를 받지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500, headers: NO_STORE });
  }
}
