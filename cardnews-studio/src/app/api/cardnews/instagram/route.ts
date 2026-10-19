import { NextResponse } from "next/server";
import { authorize } from "@/lib/cardnews/apiGuard";
import { getMemberInstagramAccount, INSTA_CONNECT_URL } from "@/lib/instagram/memberAccount";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/** GET — 회원 본인 인스타그램 연결 상태(토큰은 보내지 않음). 연결은 INSTA 포스팅 자동화에서 한 번 하면 여기서도 그대로 쓴다. */
export async function GET() {
  const gate = await authorize();
  if (!gate.ok) return gate.response;
  const account = await getMemberInstagramAccount(gate.auth.user.id);
  return NextResponse.json({
    connected: !!account,
    username: account?.username ?? "",
    expired: account?.expired ?? false,
    connectUrl: INSTA_CONNECT_URL,
  });
}
