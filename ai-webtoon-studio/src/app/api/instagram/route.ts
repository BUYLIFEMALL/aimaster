import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getMemberInstagramAccount, INSTA_CONNECT_URL } from "@/lib/instagram/memberAccount";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/** GET — 회원 본인 인스타그램 연결 상태(토큰은 보내지 않음). 연결은 INSTA 포스팅 자동화에서 한 번 하면 여기서도 그대로 쓴다. */
export async function GET() {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const account = await getMemberInstagramAccount(access.user.id);
  return NextResponse.json({
    connected: !!account,
    username: account?.username ?? "",
    expired: account?.expired ?? false,
    connectUrl: INSTA_CONNECT_URL,
  });
}
