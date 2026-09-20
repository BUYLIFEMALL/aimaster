import { NextRequest, NextResponse } from "next/server";
import { verifyPersonalAccessToken } from "@/lib/personalAccessTokenAuth";

// 데스크톱 앱이 `Authorization: Bearer <토큰>`으로 호출해서 "이 토큰이 아직 유효한지,
// 어느 계정에 연결돼 있는지"를 확인하는 용도. redirect를 쓰지 않고 JSON으로만 응답한다
// (API route는 항상 checkProgramAccessApi 스타일 — CLAUDE.md 멀티테넌시 원칙 1번 참고).
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const PROGRAM_SLUG = "naver-blog-auto-poster";

export async function GET(request: NextRequest) {
  const auth = await verifyPersonalAccessToken(request, PROGRAM_SLUG);
  if (!auth) {
    return NextResponse.json({ error: "유효하지 않거나 폐기된 토큰입니다." }, { status: 401 });
  }

  return NextResponse.json({ email: auth.email, name: auth.name });
}
