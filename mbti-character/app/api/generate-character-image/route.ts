import { NextRequest, NextResponse } from "next/server";
import { CHARACTERS, ALL_TYPE_CODES } from "@/lib/characters";
import { getImageStyle } from "@/lib/imageStyles";
import { checkProgramAccessApi } from "@/lib/access";
import { resolveApiKey } from "@/lib/apiKeys";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/**
 * "나노바나나"로 불리는 Gemini 이미지 생성 모델을 호출한다.
 *
 * 2026-09-14: 로그인이 없던 시절엔 방문자가 결과 화면에서 그때그때 Gemini API 키를 직접
 * 입력하고 브라우저 localStorage에만 보관하는 BYOK 방식이었다. 로그인이 필수가 된 뒤에도
 * 이 방식이 그대로 남아있어 "API 키를 프로그램 시작할 때 등록하게 하는 절차가 빠져있다"는
 * 지적을 받고서, 다른 서브프로젝트(naver-cafe-poster 등)와 동일한 표준 패턴으로 바꿨다 —
 * 클라이언트는 더 이상 apiKey를 보내지 않고, 이 라우트가 checkProgramAccessApi()로 로그인을
 * 확인한 뒤 resolveApiKey()로 그 회원이 /settings에서 등록해둔 본인 Gemini 키를 공용
 * user_api_keys 테이블에서 꺼내 쓴다. 앱/운영자 공용 키로 폴백하지 않으므로, 키 미등록 시
 * 조용히 실패하지 않고 명확한 에러를 반환한다(클라이언트는 이를 ApiKeyRequiredModal로 안내).
 *
 * 클라이언트가 자유 텍스트 프롬프트를 직접 보내게 하지 않는다 — 그러면 방문자가 우리 서버를
 * 임의 프롬프트 릴레이로 악용할 수 있으므로, 반드시 CHARACTERS/IMAGE_STYLES에 미리 정의된
 * 조합(typeCode + styleId)만 받아 서버에서 프롬프트를 조립한다.
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

  const apiKey = await resolveApiKey(access.user.id, "gemini");
  if (!apiKey) {
    return NextResponse.json(
      { error: "Gemini API 키가 등록되지 않았습니다. /settings에서 먼저 등록해주세요.", code: "NO_API_KEY" },
      { status: 400 },
    );
  }

  let body: { typeCode?: string; styleId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { typeCode, styleId } = body;

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
    let message = "이미지 생성에 실패했습니다. /settings에서 등록한 API 키가 유효한지 확인해주세요.";
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
