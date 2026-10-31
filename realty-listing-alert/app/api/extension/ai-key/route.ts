import { NextResponse } from "next/server";
import { verifyExtensionToken } from "@/lib/extensionAuth";
import { createServiceClient } from "@/lib/supabase/service";
import { aiProviderInfo, toAiProvider } from "@/lib/aiProviders";
import { resolveAiModel } from "@/lib/aiModels";
import { getAiKey } from "@/lib/notifyChannels";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 회원이 분석 버튼을 누를 때만 그 회원 본인의, 누른 AI 키와 설정에서 고른 모델을 확장에 건넨다. 다른 키로 대신하지 않는다.
export async function GET(request: Request) {
  const user = await verifyExtensionToken(request);
  if (!user) return NextResponse.json({ error: "유효하지 않은 연동 토큰이거나 이용 권한이 없습니다." }, { status: 401 });
  const provider = toAiProvider(new URL(request.url).searchParams.get("provider"));
  const supabase = createServiceClient();
  const apiKey = await getAiKey(supabase, user.userId, provider);
  if (!apiKey) return NextResponse.json({ error: `${aiProviderInfo(provider).name} API 키가 없어요. 「API키등록·플랫폼연동」에서 본인 키를 등록해 주세요.` }, { status: 400 });
  const { data } = await supabase.from("realty_alert_settings").select("ai_models").eq("user_id", user.userId).maybeSingle();
  return NextResponse.json({ provider, apiKey, model: resolveAiModel(provider, (data?.ai_models as Record<string, string> | null)?.[provider]) });
}
