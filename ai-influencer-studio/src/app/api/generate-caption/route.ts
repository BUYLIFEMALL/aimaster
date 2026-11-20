import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserGeminiApiKey } from "@/lib/apiKeys";
import { generateInstagramCaption } from "@/lib/gemini";
import { checkTextInputs } from "@/lib/textOutput";
import { readJsonObject, textErrorResponse } from "@/lib/textRoute";
import type { InfluencerConfig } from "@/types/influencer";

export const maxDuration = 30;

/** 나이·성별 칸의 최대 글자 수 — 지금 목록 값보다 넉넉하게, 긴 글이 지시문에 끼어들지 않을 만큼만 */
const PERSONA_FIELD_LIMIT = 40;

export async function POST(req: Request) {
  const auth = await checkProgramAccessApi();
  if (!auth.allowed) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const apiKey = await getUserGeminiApiKey(auth.user.id);
  if (!apiKey) {
    return NextResponse.json(
      {
        error: "Google Gemini API 키가 등록되어 있지 않습니다.",
        needApiKey: true,
      },
      { status: 400 }
    );
  }

  try {
    // 2026-11-20(R2 3단계): 본문·입력 길이를 호출 전에 확인한다 — 회원 본인 키의 비용이 한 번에 커지지 않게
    const body = await readJsonObject(req);
    const config = body?.config;
    if (!body || !config || typeof config !== "object" || Array.isArray(config)) {
      return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
    }
    const c = config as Record<string, unknown>;
    const input = checkTextInputs({
      refinementRequest: body.refinementRequest, productName: c.productName, location: c.location,
      storyContext: c.storyContext, outfit: c.outfit,
    });
    if (!input.ok) return NextResponse.json({ error: input.message, field: input.field }, { status: 400 });
    // 지시문 맨 앞에 들어가는 나이·성별(2026-11-20, Mac msg_97490a26a4d2): 화면은 목록 값(성별 최대 9자·나이 최대 2자)이나 빈 글만 보낸다.
    // 예전 히스토리 설정의 다른 모양도 받아 주도록 목록 대조는 하지 않고, 글자인지와 짧은 상한(PERSONA_FIELD_LIMIT)만 본다.
    const persona = checkTextInputs({ age: c.age, gender: c.gender }, PERSONA_FIELD_LIMIT);
    if (!persona.ok) return NextResponse.json({ error: persona.message, field: persona.field }, { status: 400 });

    const refinementRequest = typeof body.refinementRequest === "string" ? body.refinementRequest : undefined;
    const { captions, notice } = await generateInstagramCaption(apiKey, config as InfluencerConfig, refinementRequest);

    // 기본 문구로 대신했으면 그 사유를 함께 보낸다(captionNotice). 정상이면 예전과 같은 모양
    return NextResponse.json({ success: true, captions, ...(notice ? { captionNotice: notice } : {}) });
  } catch (err: unknown) {
    console.error("Generate Caption API Error:", err instanceof Error ? err.name : "unknown");
    return textErrorResponse(err, "캡션 생성 중 오류가 발생했습니다.");
  }
}
