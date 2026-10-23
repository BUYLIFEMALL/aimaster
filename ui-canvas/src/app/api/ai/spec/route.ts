import { NextResponse, type NextRequest } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserGeminiApiKey } from "@/lib/apiKeys";
import { friendlyAiError, suggestSpec } from "@/lib/gemini";
import { isValidComponentsArray, summarizeForSpec } from "@/lib/canvas/model";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;
const NO_STORE = { "Cache-Control": "private, no-store" };

export async function POST(request: NextRequest) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status, headers: NO_STORE });

  let components: unknown;
  try { components = (await request.json()).components; } catch { /* 아래에서 처리 */ }
  if (!isValidComponentsArray(components) || components.length === 0) {
    return NextResponse.json({ error: "AI 제안을 받으려면 캔버스에 컴포넌트를 하나 이상 추가해 주세요." }, { status: 400, headers: NO_STORE });
  }

  // 본인 키만 사용한다. 없으면 폴백 없이 등록 안내(needKey)를 돌려준다.
  const apiKey = await getUserGeminiApiKey(access.user.id);
  if (!apiKey) {
    return NextResponse.json(
      { error: "Gemini API 키가 등록되지 않았습니다. [API키등록·플랫폼연동]에서 본인의 Google Gemini API 키를 먼저 등록해 주세요.", needKey: true },
      { status: 400, headers: NO_STORE },
    );
  }
  try {
    const spec = await suggestSpec(apiKey, summarizeForSpec(components));
    return NextResponse.json({ spec }, { headers: NO_STORE });
  } catch (error) {
    const e = friendlyAiError(error);
    return NextResponse.json({ error: e.message }, { status: e.status, headers: NO_STORE });
  }
}
