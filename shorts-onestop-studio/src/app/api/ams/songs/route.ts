import { NextResponse, type NextRequest } from "next/server";
import { fail, guard, json } from "@/lib/route";
import { listLibrarySongs } from "@/lib/amsSongs";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// v1.38 AI 음악 스튜디오 내 완성곡 목록 → v1.50 「내 자료함」 음악 전체(회원 본인 것만, 미리 듣기 1시간 주소)
export async function GET(request: NextRequest) {
  try {
    const g = await guard(request); if (g instanceof NextResponse) return g;
    return json({ songs: await listLibrarySongs(g.userId) });
  } catch (e) { return fail(e); }
}
