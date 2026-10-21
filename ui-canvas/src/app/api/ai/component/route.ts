import { NextResponse, type NextRequest } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserGeminiApiKey } from "@/lib/apiKeys";
import { friendlyAiError } from "@/lib/gemini";
import { generateComponentCode } from "@/lib/gallery/generateComponent";

// AI 컴포넌트 생성(2026-10-21 병합 D). 옛 앱 /api/generate와 달리 브라우저가 보낸 키는 받지 않고 서버의 본인 키만 쓴다.
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;
const NO_STORE = { "Cache-Control": "private, no-store" };

export async function POST(request: NextRequest) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status, headers: NO_STORE });
  const body = (await request.json().catch(() => null)) as { prompt?: unknown; componentType?: unknown } | null;
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim().slice(0, 2000) : "";
  const componentType = typeof body?.componentType === "string" ? body.componentType.slice(0, 80) : "";
  if (!prompt) return NextResponse.json({ error: "요청할 컴포넌트에 대한 설명을 입력해 주세요." }, { status: 400, headers: NO_STORE });

  const apiKey = await getUserGeminiApiKey(access.user.id);
  if (!apiKey) {
    return NextResponse.json(
      { error: "Gemini API 키가 등록되지 않았습니다. [API키등록·플랫폼연동]에서 본인의 Google Gemini API 키를 먼저 등록해 주세요.", needKey: true },
      { status: 400, headers: NO_STORE },
    );
  }
  try {
    const code = await generateComponentCode(apiKey, prompt, componentType);
    return NextResponse.json({ code }, { headers: NO_STORE });
  } catch (error) {
    const e = friendlyAiError(error);
    return NextResponse.json({ error: e.message }, { status: e.status, headers: NO_STORE });
  }
}
