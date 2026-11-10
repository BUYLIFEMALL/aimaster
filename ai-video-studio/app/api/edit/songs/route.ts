import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/server";
import { listMemberAssets } from "@/lib/memberAssets";
import { toLibrarySongs } from "@/lib/edit/librarySongs";
import { AMS_APP_URL } from "@/lib/edit/amsSongs";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/** 영상 합치기 배경음악 — 「내 자료함」 음악(회원 본인 것만: AI 음악 스튜디오·Suno 음악 자동화·무료음악). v1.35 — 예전엔 AI 음악 스튜디오 곡만 */
export async function GET() {
  const { user, errorResponse } = await checkProgramAccessApi();
  if (errorResponse) return errorResponse;
  try {
    const assets = await listMemberAssets(createAdminClient(), user.id, { kind: "audio", limit: 60 });
    return NextResponse.json({ songs: toLibrarySongs(assets), appUrl: AMS_APP_URL, libraryUrl: "https://www.buylife.xyz/library" }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "내 자료함 음악 목록을 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요." }, { status: 500 });
  }
}
