import { NextRequest, NextResponse } from "next/server";
import { CHARACTERS, ALL_TYPE_CODES } from "@/lib/characters";
import { getImageStyle } from "@/lib/imageStyles";
import { checkProgramAccessApi } from "@/lib/access";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/**
 * "나노바나나"로 불리는 Gemini 이미지 생성 모델을 호출한다. 이 프로젝트는 원래 로그인 없는
 * 완전 공개 서비스였으나(2026-09-14 이전), 이후 회원가입 유도 채널로도 쓰기 위해 로그인을
 * 요구하는 구조로 바뀌었다 — 이 라우트도 다른 쓰기/과금성 API와 동일하게 checkProgramAccessApi()로
 * 로그인+이용 권한을 확인한다. 다만 이미지 생성 자체의 비용은 방문자 본인의 Gemini API
 * 키로 부담하게 한다 — 로그인은 했지만 회원별 API 키를 저장해둘 표준 `user_api_keys`
 * 레이어를 아직 두지 않았으므로(자기완결형 서브프로젝트, 계정 수가 적어 오버엔지니어링
 * 방지), 방문자가 결과 화면에서 그때그때 자신의 Gemini API 키를 입력하게 하고, 이 라우트는
 * 그 키를 어디에도 저장/로깅하지 않고 Gemini API에 그대로 전달만 하는 무상태(stateless)
 * 프록시 역할만 한다.
 *
 * 클라이언트가 자유 텍스트 프롬프트를 직접 보내게 하지 않는다 — 그러면 방문자가 입력한 남의
 * API 키를 우리 서버가 임의 프롬프트 릴레이로 악용당할 수 있으므로, 반드시 CHARACTERS/
 * IMAGE_STYLES에 미리 정의된 조합(typeCode + styleId)만 받아 서버에서 프롬프트를 조립한다.
 */
const MODEL_ID = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";

function buildPrompt(typeCode: string, styleId: string): string | null {
  const character = CHARACTERS[typeCode];
  const style = getImageStyle(styleId);
  if (!character || !style) return null;

  return (
    `${style.promptModifier}. A single character portrait of "${character.name}", who works as ` +
    `${character.role}. Personality traits: ${character.traits.join(", ")}. ${character.description} ` +
    `Plain simple background, no text or logos or watermark in the image, square 1:1 composition, high quality illustration.`
  );
}

export async function POST(request: NextRequest) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  let body: { apiKey?: string; typeCode?: string; styleId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { apiKey, typeCode, styleId } = body;

  if (!apiKey || typeof apiKey !== "string") {
    return NextResponse.json({ error: "Gemini API 키가 필요합니다." }, { status: 400 });
  }
  if (!typeCode || !ALL_TYPE_CODES.includes(typeCode.toUpperCase())) {
    return NextResponse.json({ error: "알 수 없는 유형입니다." }, { status: 400 });
  }
  if (!styleId || !getImageStyle(styleId)) {
    return NextResponse.json({ error: "알 수 없는 스타일입니다." }, { status: 400 });
  }

  const prompt = buildPrompt(typeCode.toUpperCase(), styleId);
  if (!prompt) {
    return NextResponse.json({ error: "프롬프트를 만들 수 없습니다." }, { status: 400 });
  }

  let googleRes: Response;
  try {
    googleRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ["IMAGE"] },
        }),
        signal: AbortSignal.timeout(30000),
      },
    );
  } catch {
    return NextResponse.json(
      { error: "이미지 생성 서버에 연결하지 못했습니다. 잠시 후 다시 시도해주세요." },
      { status: 502 },
    );
  }

  if (!googleRes.ok) {
    let message = "이미지 생성에 실패했습니다. API 키를 확인해주세요.";
    try {
      const parsed = await googleRes.json();
      if (parsed?.error?.message) message = parsed.error.message;
    } catch {}
    return NextResponse.json({ error: message }, { status: googleRes.status });
  }

  const data = await googleRes.json();
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p: { inlineData?: { data?: string } }) => p.inlineData?.data);

  if (!imagePart) {
    return NextResponse.json(
      { error: "이미지가 생성되지 않았습니다. 잠시 후 다시 시도해주세요." },
      { status: 502 },
    );
  }

  const { mimeType, data: base64 } = imagePart.inlineData;
  return NextResponse.json({ imageDataUrl: `data:${mimeType};base64,${base64}` });
}
