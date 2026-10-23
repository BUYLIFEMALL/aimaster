import { NextResponse, type NextRequest } from "next/server";
import { fail, guard, json } from "@/lib/route";
import { importAmsSong } from "@/lib/amsSongs";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;

// v1.38 고른 곡을 이 프로그램 저장소(<user_id>/ams/)로 복사해 배경음악 경로를 돌려준다
export async function POST(request: NextRequest) {
  try {
    const g = await guard(request); if (g instanceof NextResponse) return g;
    return json(await importAmsSong(g.userId, String(g.body.ref ?? "")));
  } catch (e) { return fail(e); }
}
