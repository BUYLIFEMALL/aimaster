import "server-only";
import { callOpenAiText } from "./openai";

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

const GEMINI_IMAGE_ENDPOINT = "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-image:generateContent";

export interface GeneratedImage {
  base64: string;
  mimeType: string;
}

/** Gemini(NanoBanana) 이미지 모델을 호출해서 base64 이미지를 받는다. */
export async function generateEmailImage(prompt: string, geminiApiKey: string): Promise<GeneratedImage> {
  if (!geminiApiKey) {
    throw new Error("Gemini API 키가 없습니다. 설정에서 본인 키를 등록해주세요.");
  }

  const response = await fetch(`${GEMINI_IMAGE_ENDPOINT}?key=${geminiApiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ["Image"],
        imageConfig: { aspectRatio: "16:9", imageSize: "1K" },
        temperature: 0.7,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini 이미지 생성이 실패했습니다. (${response.status}) ${errorBody}`);
  }

  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { inlineData?: { data?: string; mimeType?: string } }[] } }[];
  };
  const part = data.candidates?.[0]?.content?.parts?.[0];
  const rawBase64 = part?.inlineData?.data;
  if (!rawBase64) throw new Error("Gemini가 이미지를 반환하지 않았습니다.");

  return { base64: rawBase64.replace(/\s+/g, ""), mimeType: part?.inlineData?.mimeType ?? "image/png" };
}
