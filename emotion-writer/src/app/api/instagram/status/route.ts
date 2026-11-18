import { NextResponse } from "next/server";
import { requireProgramAccess } from "@/lib/access";
import { getInstagramPublicStatus } from "@/lib/instagram/memberAccount";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET() {
  try {
    const user = await requireProgramAccess();
    const status = await getInstagramPublicStatus(user.id);
    return NextResponse.json(status);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "인스타그램 연동 상태 확인에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
