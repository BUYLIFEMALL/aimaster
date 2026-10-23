import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { AMS_APP_URL, listAmsSongs } from "@/lib/edit/amsSongs";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/** 영상 합치기 배경음악 — 회원 본인의 AI 음악 스튜디오 완성곡 목록(읽기만) */
export async function GET() {
  const { user, errorResponse } = await checkProgramAccessApi();
  if (errorResponse) return errorResponse;
  try {
    return NextResponse.json({ songs: await listAmsSongs(user.id), appUrl: AMS_APP_URL }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "AI 음악 스튜디오 곡 목록을 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요." }, { status: 500 });
  }
}
