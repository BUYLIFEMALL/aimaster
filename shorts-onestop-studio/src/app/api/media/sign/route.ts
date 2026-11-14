import { NextResponse, type NextRequest } from "next/server";
import { fail, guard, json } from "@/lib/route";
import { signPaths } from "@/lib/media";
import { createAdminClient } from "@/lib/supabase/admin";
import { signMemberAssetByRef } from "@/lib/memberAssets";
import { isLibraryRef } from "@/lib/productShorts";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 저장된 AI 배경 이미지의 임시 주소(1시간) — 본인 폴더 경로만
export async function POST(request: NextRequest) {
  try {
    const g = await guard(request); if (g instanceof NextResponse) return g;
    const paths = (Array.isArray(g.body.paths) ? g.body.paths : []).map(String);
    const urls: Record<string, string> = await signPaths(g.userId, paths);
    // v1.55 「내 자료함」 원본 번호 → 본인 자료만 임시 주소(키 "ref:<번호>"), 지워졌거나 남의 것이면 빠짐
    const refs = Array.from(new Set((Array.isArray(g.body.refs) ? g.body.refs : []).filter(isLibraryRef))).slice(0, 12);
    if (refs.length) {
      const admin = createAdminClient();
      await Promise.all(refs.map(async (r) => { const a = await signMemberAssetByRef(admin, g.userId, r); if (a?.playUrl && a.kind === "image") urls[`ref:${r}`] = a.playUrl; }));
    }
    return json({ urls });
  } catch (e) { return fail(e); }
}
