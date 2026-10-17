// [이미지 모델 교체 2026-10-17] 구형(gemini-2.5-flash-image·gemini-3.1-flash-image·*-preview) → 최신 정식(gemini-nano-banana-2.1·gemini-3-pro-image), 기준: ai-image-studio v1.11 lib/providers/adapters/gemini.ts.
// 실제 이미지 생성 시험은 하지 않았음 — 이미지 생성 오류가 나면 그때 테스트 검증한다(주인님 지시).
import { NextRequest, NextResponse } from "next/server";
import { getCard } from "@/lib/cards";
import { CARD_STYLES, type CardStyle } from "@/lib/deck";
import { checkProgramAccessApi } from "@/lib/access";
import { resolveApiKey } from "@/lib/apiKeys";
import { createClient } from "@/lib/supabase/server";
import { GeminiImageError, generateGeminiImage } from "@/lib/ai/geminiImage";
import { getNanoBananaConfig } from "@/lib/ai/nanoBananaModels";

const STORAGE_BUCKET = "tarot-card-images";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/**
 * "나노바나나"로 불리는 Gemini 이미지 생성 모델을 호출해 뽑힌 카드 1장의 일러스트를 만든다.
 * naver-cafe-poster/src/lib/ai/imageGenerator.ts 와 동일한 모델 매핑 표준 패턴을 적용한다.
 */
// 2026-10-17: 등급별 모델·화질·온도는 공용 기준 코드 gemini-image-models(@/lib/ai/nanoBananaModels — 기준은 ai-image-studio)로 통합(주인님 지시).

const KOREAN_PERSON_RULE =
  "If the illustration depicts any human figure, portray them with Korean (East Asian) " +
  "features and styling by default, unless the card's traditional context specifically " +
  "calls for a different setting or origin.";

function buildPrompt(
  cardId: string,
  orientation: "upright" | "reversed",
  style: CardStyle = "watercolor",
): string | null {
  const card = getCard(cardId);
  if (!card) return null;

  const styleOption = CARD_STYLES[style] ?? CARD_STYLES.watercolor;

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
    `Art style: ${styleOption.promptModifier}. ` +
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

  let body: { cardId?: string; orientation?: string; style?: CardStyle; model?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { cardId, orientation, style = "watercolor", model } = body;
  const modelKey = model && model.trim() ? model.trim() : "nanobanana-2-2k";
  const config = getNanoBananaConfig(modelKey);

  if (!cardId || !getCard(cardId)) {
    return NextResponse.json({ error: "알 수 없는 카드입니다." }, { status: 400 });
  }
  if (orientation !== "upright" && orientation !== "reversed") {
    return NextResponse.json({ error: "알 수 없는 방향입니다." }, { status: 400 });
  }

  const prompt = buildPrompt(cardId, orientation, style);
  if (!prompt) {
    return NextResponse.json({ error: "프롬프트를 만들 수 없습니다." }, { status: 400 });
  }

  // 2026-10-17: 호출·대기·이미지 받아오기는 공용 기준 코드 gemini-image-client, 모델 이름은 gemini-image-models(기준은 ai-image-studio).
  // 키는 머리글로, 시간 제한·서버 오류·혼잡 1회 재시도, 응답의 모든 조각에서 이미지 탐색, 안전 차단·한도·키 오류 한국어 안내. 프롬프트·비율·화질은 그대로.
  let image: { base64: string; mimeType: string };
  try {
    image = await generateGeminiImage({
      apiKey,
      modelName: config.modelName,
      prompt,
      aspectRatio: "2:3",
      imageSize: config.imageSize,
      temperature: config.temperature,
      responseModalities: ["IMAGE"],
      timeoutMs: 60000,
    });
  } catch (e) {
    if (e instanceof GeminiImageError) return NextResponse.json({ error: e.message }, { status: e.status >= 400 && e.status < 600 ? e.status : 502 });
    return NextResponse.json({ error: "이미지 생성 서버에 연결하지 못했습니다. 잠시 후 다시 시도해주세요." }, { status: 502 });
  }

  const { mimeType, base64 } = image;
  const buffer = Buffer.from(base64, "base64");
  const ext = mimeType?.includes("png") ? "png" : mimeType?.includes("webp") ? "webp" : "jpg";
  const objectPath = `${access.user.id}/${cardId}-${orientation}-${style}-${Date.now()}.${ext}`;

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
