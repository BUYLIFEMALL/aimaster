import { NextResponse } from "next/server";
import { requireAccess } from "@/lib/routeGuard";
import { listThumbnailPicks } from "@/lib/youtube/thumbnailPicks";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
const NO_STORE = { "Cache-Control": "private, no-store" };

// v1.26 「AI 썸네일·SEO 자동화」에서 만든 내 썸네일 최근 12개(회원 본인 것만, 서명 주소 1시간)
export async function GET() {
  const g = await requireAccess(); if (g.error) return g.error;
  try {
    return NextResponse.json({ picks: await listThumbnailPicks(g.user.id) }, { headers: NO_STORE });
  } catch (e) {
    console.error("[playlist thumbnail picks]", e instanceof Error ? e.message.slice(0, 200) : "unknown");
    return NextResponse.json({ error: "썸네일 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500, headers: NO_STORE });
  }
}
