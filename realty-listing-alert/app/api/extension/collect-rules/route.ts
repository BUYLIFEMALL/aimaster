import { NextResponse } from "next/server";
import { verifyExtensionToken } from "@/lib/extensionAuth";
import { COLLECT_RULES } from "@/lib/collectRules";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 수집 규칙 JSON — 로그인한 확장(회원 연결 코드)만.
export async function GET(request: Request) {
  const user = await verifyExtensionToken(request);
  if (!user) return NextResponse.json({ error: "유효하지 않은 연동 토큰이거나 이용 권한이 없습니다." }, { status: 401 });
  return NextResponse.json(COLLECT_RULES);
}
