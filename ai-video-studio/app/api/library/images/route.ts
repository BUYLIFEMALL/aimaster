import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/server";
import { listMemberAssets } from "@/lib/memberAssets";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/** 만들기 화면 시작·끝 장면 사진 — 「내 자료함」 이미지(회원 본인 것만, 서버에 파일이 있는 것만). v1.36 */
export async function GET() {
  const { user, errorResponse } = await checkProgramAccessApi();
  if (errorResponse) return errorResponse;
  try {
    const assets = await listMemberAssets(createAdminClient(), user.id, { kind: "image", limit: 60 });
    const images = assets
      .filter((a) => a.playUrl && !a.localOnly)
      .map((a) => ({ ref: a.sourceRef, title: a.title, source: a.sourceSlug, url: a.playUrl as string, createdAt: a.createdAt }));
    return NextResponse.json({ images, libraryUrl: "https://www.buylife.xyz/library" }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "내 자료함 사진 목록을 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요." }, { status: 500 });
  }
}
