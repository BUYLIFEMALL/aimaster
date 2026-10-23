import { NextResponse, type NextRequest } from "next/server";
import { fail, guard, json } from "@/lib/route";
import { listThumbnailPicks } from "@/lib/youtube/thumbnailPicks";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// v1.09 「AI 썸네일·SEO 자동화」에서 만든 내 썸네일 최근 12개(회원 본인 것만, 서명 주소 1시간)
export async function GET(request: NextRequest) {
  try {
    const g = await guard(request); if (g instanceof NextResponse) return g;
    return json({ picks: await listThumbnailPicks(g.userId) });
  } catch (e) { return fail(e); }
}
