import { NextRequest, NextResponse } from "next/server";
import { verifyPersonalAccessTokenWithProgramAccess } from "@/lib/personalAccessTokenAuth";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const PROGRAM_SLUG = "threads-content-ops";

export async function GET(request: NextRequest) {
  const result = await verifyPersonalAccessTokenWithProgramAccess(request, PROGRAM_SLUG);
  if (!result) {
    return NextResponse.json(
      { error: "유효하지 않은 연동 토큰이거나 프로그램 이용 권한이 없습니다." },
      { status: 401 }
    );
  }

  return NextResponse.json({
    email: result.token.email,
    name: result.token.name,
    isAdmin: result.token.isAdmin,
  });
}
