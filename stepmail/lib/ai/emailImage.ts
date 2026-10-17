// [이미지 모델 교체 2026-10-17] 구형(gemini-2.5-flash-image·gemini-3.1-flash-image·*-preview) → 최신 정식(gemini-nano-banana-2.1·gemini-3-pro-image), 기준: ai-image-studio v1.11 lib/providers/adapters/gemini.ts.
// 실제 이미지 생성 시험은 하지 않았음 — 이미지 생성 오류가 나면 그때 테스트 검증한다(주인님 지시).
import "server-only";
import { callOpenAiText } from "./openai";
import { generateGeminiImage } from "./geminiImage";
import { DEFAULT_NANO_BANANA_MODEL, getNanoBananaConfig } from "./nanoBananaModels";

// blog(utils/news/imageGenerator.ts)의 generateArticleBasedImagePrompts + NanoBanana(Gemini
// 이미지 모델) 패턴을 참고했다. blog는 기사 3단락마다 이미지를 만들지만, 이메일은 1통짜리라
// "핵심 주제를 반영한 이미지 1장"만 만든다. 2단계로 나눈 이유도 동일: 1) GPT로 영어 사진
// 프롬프트를 먼저 만들고 2) 그 프롬프트로 Gemini 이미지 모델을 호출한다.
const IMAGE_PROMPT_SYSTEM = `You are an expert photorealistic image prompt engineer for a marketing email illustration.
Given an email's topic/keywords/subject/body, write ONE English prompt describing a single photorealistic
real-world scene (NOT artwork, NOT illustration, NOT infographic, NOT 3D render) that visually represents
the email's core topic. Rules:
- Output ONLY the prompt text itself, no explanation, no markdown, no quotes.
- One unified scene in a single frame (not a collage, not a split screen, not multiple panels).
- If human figures appear, depict realistic Korean/East Asian individuals by default. Only depict a
  different ethnicity/nationality when the topic specifically names a foreign celebrity, politician,
  entertainer, or athlete, or explicitly describes a foreign country/setting central to the topic.
- Include camera/lens/lighting details (e.g. shot on a specific camera, prime lens, aperture, ISO, color
  temperature) for a documentary-quality photorealistic look.
- End with: "16:9, no visible text, no logos, no watermark".`;

export interface GenerateEmailImagePromptInput {
  topic: string;
  keywords?: string[];
  subject: string;
  bodyText: string;
}

export async function generateEmailImagePrompt(input: GenerateEmailImagePromptInput, openaiApiKey: string): Promise<string> {
  const lines = [
    `주제: ${input.topic}`,
    input.keywords?.length ? `키워드: ${input.keywords.join(", ")}` : null,
    `제목: ${input.subject}`,
    `본문 요약: ${input.bodyText.slice(0, 600)}`,
  ].filter(Boolean);

  const prompt = await callOpenAiText(IMAGE_PROMPT_SYSTEM, lines.join("\n"), openaiApiKey, {
    model: "gpt-4o-mini",
    temperature: 0.8,
    maxTokens: 400,
  });
  return prompt.trim();
}


export interface GeneratedImage {
  base64: string;
  mimeType: string;
}

/** Gemini(NanoBanana) 이미지 모델을 호출해서 base64 이미지를 받는다. */
export async function generateEmailImage(prompt: string, geminiApiKey: string): Promise<GeneratedImage> {
  if (!geminiApiKey) {
    throw new Error("Gemini API 키가 없습니다. 설정에서 본인 키를 등록해주세요.");
  }

  // 2026-10-17: 호출·대기·이미지 받아오기는 공용 기준 코드 gemini-image-client, 모델 이름은 gemini-image-models(기준은 ai-image-studio).
  // 키는 머리글로, 시간 제한·서버 오류·혼잡 1회 재시도, 응답의 모든 조각에서 이미지 탐색, 안전 차단·한도·키 오류 한국어 안내. 프롬프트·비율·화질은 그대로.
  const image = await generateGeminiImage({
    apiKey: geminiApiKey,
    modelName: getNanoBananaConfig(DEFAULT_NANO_BANANA_MODEL).modelName,
    prompt,
    aspectRatio: "16:9",
    imageSize: "1K",
    temperature: 0.7,
    responseModalities: ["Image"],
  });
  return { base64: image.base64, mimeType: image.mimeType };
}
