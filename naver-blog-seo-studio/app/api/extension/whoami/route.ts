import { NextResponse } from "next/server";
import { verifyExtensionToken } from "@/lib/extensionAuth";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(request: Request) {
  const user = await verifyExtensionToken(request);
  if (!user) return NextResponse.json({ error: "유효하지 않은 연동 토큰이거나 이용 권한이 없습니다." }, { status: 401 });
  return NextResponse.json({ email: user.email, name: user.name, isAdmin: false });
}
