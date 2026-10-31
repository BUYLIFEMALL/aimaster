import { NextResponse } from "next/server";
import { verifyExtensionToken } from "@/lib/extensionAuth";
import { getAnthropicKey } from "@/lib/notifyChannels";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 회원이 AI 요약을 누를 때만 그 회원 본인 Claude 키를 확장에 건넨다. 다른 키로 대신하지 않는다.
export async function GET(request: Request) {
  const user = await verifyExtensionToken(request);
  if (!user) return NextResponse.json({ error: "유효하지 않은 연결 코드이거나 이용 권한이 없습니다." }, { status: 401 });
  const apiKey = await getAnthropicKey(createAdminClient(), user.userId);
  if (!apiKey) return NextResponse.json({ error: "Claude API 키가 없습니다. 메인 사이트 API 설정(https://www.buylife.xyz/api-settings)에서 본인 키를 등록해 주세요." }, { status: 400 });
  return NextResponse.json({ apiKey });
}
