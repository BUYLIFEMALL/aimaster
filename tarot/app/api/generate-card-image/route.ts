import { NextRequest, NextResponse } from "next/server";
import { getCard } from "@/lib/cards";
import { checkProgramAccessApi } from "@/lib/access";
import { resolveApiKey } from "@/lib/apiKeys";
import { createClient } from "@/lib/supabase/server";

const STORAGE_BUCKET = "tarot-card-images";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/**
 * "나노바나나"로 불리는 Gemini 이미지 생성 모델을 호출해 뽑힌 카드 1장의 일러스트를 만든다.
 * mbti-character/app/api/generate-character-image/route.ts와 완전히 동일한 표준 패턴이다:
 * - checkProgramAccessApi()로 로그인+이용권한을 확인하고, resolveApiKey()로 그 회원이
 *   /settings에서 등록해둔 본인 Gemini 키만 쓴다(앱 공용 키 폴백 없음).
 * - 클라이언트는 자유 텍스트 프롬프트를 보낼 수 없다 — cardId(78장 중 하나)와
 *   orientation(정/역방향)만 받고, 실제 프롬프트는 이 서버가 lib/cards.ts의 고정 데이터로만
 *   조립한다. 그렇지 않으면 방문자가 우리 서버를 임의 프롬프트 릴레이로 악용할 수 있다.
 * - 생성된 이미지는 base64로만 돌려주지 않고 Supabase Storage 공개 버킷(tarot-card-images)에
 *   회원 본인 폴더로 업로드해 공개 URL을 반환한다 — 카카오톡 공유(imageUrl)와 공유 링크의
 *   og:image 둘 다 실제 HTTP(S) URL이 있어야 미리보기가 뜨기 때문이다.
 */
const MODEL_ID = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";

// 루트 CLAUDE.md 플랫폼 공통 원칙 3번: 인물이 등장하는 이미지는 별다른 지시가 없으면
// 한국인(동아시아인) 외모로 묘사한다. 타로 카드 대부분(특히 메이저 아르카나)이 전통적으로
// 사람을 그리므로, 카드 종류를 가리지 않고 모든 프롬프트에 이 지시를 항상 포함시킨다 —
// 사람이 등장하지 않는 카드라면 이 문장은 그냥 무해하게 무시된다.
const KOREAN_PERSON_RULE =
  "If the illustration depicts any human figure, portray them with Korean (East Asian) " +
  "features and styling by default, unless the card's traditional context specifically " +
  "calls for a different setting or origin.";

function buildPrompt(cardId: string, orientation: "upright" | "reversed"): string | null {
  const card = getCard(cardId);
  if (!card) return null;

  const orientationLine =
    orientation === "reversed"
      ? "Depict the card in its REVERSED (upside-down) meaning: convey a somber, blocked, or " +
        "introspective mood through composition, color and symbolism — muted or cooler tones, " +
        "slightly chaotic or inverted symbolic elements — while keeping the artwork itself " +
        "right-side-up and legible."
      : "Depict the card in its upright, positive/active meaning: bright, confident, harmonious " +
        "mood through composition, color and symbolism.";

  return (
    `A single mystical tarot card illustration for "${card.nameEn}" (${card.nameKo}), ` +
    `${card.arcana === "major" ? "Major Arcana" : `Minor Arcana, suit of ${card.suit}`}. ` +
    `Key themes: ${card.keywords.join(", ")}. ${orientationLine} ` +
    `${KOREAN_PERSON_RULE} ` +
    `Ornate symbolic tarot card art style, rich painterly detail, vertical portrait composition ` +
    `suitable for a tarot card (roughly 2:3 aspect ratio), decorative border, no visible text, ` +
    `no numbers, no captions, no watermark in the image, high quality illustration.`
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

  let body: { cardId?: string; orientation?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { cardId, orientation } = body;
  if (!cardId || !getCard(cardId)) {
    return NextResponse.json({ error: "알 수 없는 카드입니다." }, { status: 400 });
  }
  if (orientation !== "upright" && orientation !== "reversed") {
    return NextResponse.json({ error: "알 수 없는 방향입니다." }, { status: 400 });
  }

  const prompt = buildPrompt(cardId, orientation);
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
  const buffer = Buffer.from(base64, "base64");
  const ext = mimeType?.includes("png") ? "png" : mimeType?.includes("webp") ? "webp" : "jpg";
  const objectPath = `${access.user.id}/${cardId}-${orientation}-${Date.now()}.${ext}`;

  const supabase = await createClient();
  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(objectPath, buffer, { contentType: mimeType ?? "image/png", upsert: true });

  if (uploadError) {
    return NextResponse.json(
      { error: "이미지 저장에 실패했습니다. 잠시 후 다시 시도해주세요." },
      { status: 502 },
    );
  }

  const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(objectPath);
  return NextResponse.json({ imageUrl: pub.publicUrl });
}
