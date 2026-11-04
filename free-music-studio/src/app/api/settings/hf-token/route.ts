import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserApiKey } from "@/lib/apiKeys";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/**
 * 회원 본인 Hugging Face 토큰을 본인 브라우저에만 돌려준다(v1.12).
 * 브라우저가 내 PC 엔진(127.0.0.1)에 작업을 넣을 때 함께 보내고, 엔진은 약관 동의가 필요한 모델을 처음 받을 때만 쓴다.
 * 다른 회원·운영자 토큰으로 대신하지 않는다(없으면 null).
 */
export async function GET() {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const token = await getUserApiKey(access.user.id, "huggingface");
  return NextResponse.json({ token: token ?? null }, { headers: { "Cache-Control": "no-store" } });
}
