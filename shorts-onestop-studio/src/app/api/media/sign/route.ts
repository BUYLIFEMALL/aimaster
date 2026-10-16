import { NextResponse, type NextRequest } from "next/server";
import { fail, guard, json } from "@/lib/route";
import { signPaths } from "@/lib/media";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 저장된 AI 배경 이미지의 임시 주소(1시간) — 본인 폴더 경로만
export async function POST(request: NextRequest) {
  try {
    const g = await guard(request); if (g instanceof NextResponse) return g;
    const paths = (Array.isArray(g.body.paths) ? g.body.paths : []).map(String);
    return json({ urls: await signPaths(g.userId, paths) });
  } catch (e) { return fail(e); }
}
