import { NextResponse, type NextRequest } from "next/server";
import { fail, guard, json } from "@/lib/route";
import { createAdminClient } from "@/lib/supabase/admin";
import { listMemberAssets } from "@/lib/memberAssets";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// v1.55 상품 사진 — 「내 자료함」 이미지(회원 본인 것, 서버에 파일이 있는 것만). 기준: ai-video-studio/app/api/library/images/route.ts
export async function GET(request: NextRequest) {
  try {
    const g = await guard(request); if (g instanceof NextResponse) return g;
    const assets = await listMemberAssets(createAdminClient(), g.userId, { kind: "image", limit: 60 });
    const images = assets.filter((a) => a.playUrl && !a.localOnly).map((a) => ({ ref: a.sourceRef, title: a.title, source: a.sourceSlug, url: a.playUrl as string, createdAt: a.createdAt }));
    return json({ images, libraryUrl: "https://www.buylife.xyz/library" });
  } catch (e) { return fail(e); }
}
