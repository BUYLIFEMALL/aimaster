import { NextRequest, NextResponse } from "next/server";
import { verifyPersonalAccessTokenWithProgramAccess } from "@/lib/personalAccessTokenAuth";

// 크롬 확장(웹버전)이 `Authorization: Bearer <토큰>`으로 호출해서 "이 토큰이 아직 유효하고,
// 이 프로그램 이용 권한(구독/개별부여/등급)이 있는지"를 확인하는 용도. 2026-09-21에
// naver-blog-auto-poster(데스크톱 앱)와 완전히 별도 유료 프로그램으로 분리되면서 새로
// 만들어짐 — program_slug가 다르므로 데스크톱 앱 토큰으로는 이 API를 통과할 수 없다.
// redirect를 쓰지 않고 JSON으로만 응답한다(CLAUDE.md 멀티테넌시 원칙 1번).
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const PROGRAM_SLUG = "naver-blog-auto-poster-web";

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
