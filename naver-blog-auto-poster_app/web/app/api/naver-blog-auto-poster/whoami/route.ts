import { NextRequest, NextResponse } from "next/server";
import { verifyPersonalAccessTokenWithProgramAccess } from "@/lib/personalAccessTokenAuth";

// 데스크톱 앱이 `Authorization: Bearer <토큰>`으로 호출해서 "이 토큰이 아직 유효하고,
// 이 프로그램 이용 권한(구독/개별부여/등급)이 있는지"를 확인하는 용도. redirect를 쓰지
// 않고 JSON으로만 응답한다(CLAUDE.md 멀티테넌시 원칙 1번).
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const PROGRAM_SLUG = "naver-blog-auto-poster";

export async function GET(request: NextRequest) {
  const result = await verifyPersonalAccessTokenWithProgramAccess(request, PROGRAM_SLUG);
  if (!result) {
    return NextResponse.json(
      { error: "유효하지 않은 토큰이거나 이 프로그램 이용 권한이 없습니다." },
      { status: 401 }
    );
  }

  return NextResponse.json({
    email: result.token.email,
    name: result.token.name,
    isAdmin: result.token.isAdmin
  });
}
