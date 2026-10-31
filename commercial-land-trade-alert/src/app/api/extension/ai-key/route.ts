import { NextResponse } from "next/server";
import { verifyExtensionToken } from "@/lib/extensionAuth";
import { aiEngine, toAiProvider } from "@/lib/aiEngines";
import { getAiKey } from "@/lib/notifyChannels";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 회원이 AI 요약을 누를 때만 그 회원 본인의, 고른 엔진 키를 확장에 건넨다. provider가 없으면(옛 확장) Claude. 다른 키로 대신하지 않는다.
export async function GET(request: Request) {
  const user = await verifyExtensionToken(request);
  if (!user) return NextResponse.json({ error: "유효하지 않은 연결 코드이거나 이용 권한이 없습니다." }, { status: 401 });
  const provider = toAiProvider(new URL(request.url).searchParams.get("provider"));
  const apiKey = await getAiKey(createAdminClient(), user.userId, provider);
  if (!apiKey) return NextResponse.json({ error: `${aiEngine(provider).name} API 키가 없습니다. API키등록·플랫폼연동의 「AI 요약 엔진」에서 본인 키를 등록해 주세요.` }, { status: 400 });
  return NextResponse.json({ apiKey });
}
