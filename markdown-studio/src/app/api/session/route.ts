import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { platformConfigured } from "@/lib/config";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export async function GET() {
  const headers = { "Cache-Control": "private, no-store" };
  if (!platformConfigured()) return NextResponse.json({ error: "프로그램 연결을 준비하고 있습니다." }, { status: 503, headers });
  try {
    const access = await checkProgramAccessApi();
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status, headers });
    return NextResponse.json({ userId: access.user.id }, { headers });
  } catch { return NextResponse.json({ error: "이용 권한 확인에 실패했습니다. 다시 시도해 주세요." }, { status: 503, headers }); }
}
