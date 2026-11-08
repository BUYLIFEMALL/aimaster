import { NextResponse, type NextRequest } from "next/server";
import { requireAccess } from "@/lib/routeGuard";
import { getFmsSongs } from "@/lib/fmsTracks";

// v1.35 AI 무료음악 자동화 곡 여러 개(?ids=<곡 번호>,… 최대 20곡)의 제목·가사 시간(음원은 회원 PC에만 있어 주지 않음)
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
const UUID = /^[0-9a-f-]{36}$/i;
const NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET(request: NextRequest) {
  const g = await requireAccess(); if (g.error) return g.error;
  const ids = Array.from(new Set((request.nextUrl.searchParams.get("ids") ?? "").split(",").map((x) => x.trim()).filter((x) => UUID.test(x)))).slice(0, 20);
  if (!ids.length) return NextResponse.json({ error: "곡 번호가 올바르지 않습니다." }, { status: 400, headers: NO_STORE });
  try {
    return NextResponse.json({ songs: await getFmsSongs(g.user.id, ids) }, { headers: NO_STORE });
  } catch (e) {
    console.error("[playlist fms songs]", e instanceof Error ? e.message : "unknown");
    return NextResponse.json({ error: "곡을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500, headers: NO_STORE });
  }
}
