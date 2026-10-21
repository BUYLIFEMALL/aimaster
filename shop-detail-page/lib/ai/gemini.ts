import "server-only";
import { generateGeminiImage } from "./geminiImage";
import { IMAGE_MODELS, DEFAULT_IMAGE_MODEL, type ImageModelKey } from "./imageModels";

export { IMAGE_MODELS, DEFAULT_IMAGE_MODEL, IMAGE_MODEL_OPTIONS, type ImageModelKey } from "./imageModels";

// n8n 워크플로우가 실제 운영에서 쓰던 모델 이름을 그대로 사용한다.
// - 상품분석(텍스트/비전): #0.상세페이지 자동화v2 | 상품분석.json → models/gemini-3.5-flash
const ANALYSIS_MODEL = "gemini-3.5-flash";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

async function callGemini(model: string, body: Record<string, unknown>, apiKey: string) {
  const res = await fetch(`${API_BASE}/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  if (!res.ok) {
    const message = json?.error?.message ?? `Gemini API 오류 (HTTP ${res.status})`;
    throw new Error(message);
  }
  return json;
}

/** 상품분석: 텍스트 프롬프트 + 이미지 1장 이상(대표이미지+참고이미지)을 함께 보내고 모델의 텍스트 응답을 반환한다. */
export async function analyzeProductWithGemini(params: {
  prompt: string;
  images: { base64: string; mimeType: string }[];
  apiKey: string;
}): Promise<string> {
  const parts: GeminiPart[] = [{ text: params.prompt }];
  for (const image of params.images) {
    parts.push({ inlineData: { mimeType: image.mimeType, data: image.base64 } });
  }

  const json = await callGemini(
    ANALYSIS_MODEL,
    { contents: [{ parts }] },
    params.apiKey,
  );

  const text = json?.candidates?.[0]?.content?.parts?.find((p: GeminiPart) => p.text)?.text;
  if (!text) {
    throw new Error("상품분석 응답에서 텍스트를 찾지 못했습니다.");
  }
  return text;
}

/** 섹션 이미지 생성: 완성 프롬프트 + 원본이미지(base64)를 선택한 나노바나나 모델에 image-to-image로 요청. */
export async function generateSectionImageWithGemini(params: {
  prompt: string;
  referenceImage: { base64: string; mimeType: string };
  aspectRatio: string;
  resolution: string;
  apiKey: string;
  model?: ImageModelKey;
}): Promise<{ base64: string; mimeType: string }> {
  // 2026-10-17: 호출·대기·이미지 받아오기는 공용 기준 코드 gemini-image-client(./geminiImage — 기준은 ai-image-studio). 키는 머리글로,
  // 시간 제한 240초(함수 한도 300초 안 — 재시도하면 한도를 넘으므로 원래처럼 재시도 없음), 응답의 모든 조각에서 최종 이미지 탐색, 안전 차단·한도·키 오류 한국어 안내.
  // 프롬프트·원본 이미지·비율·화질은 그대로(온도는 원래 넣지 않았으므로 넣지 않음).
  const image = await generateGeminiImage({
    apiKey: params.apiKey,
    modelName: IMAGE_MODELS[params.model ?? DEFAULT_IMAGE_MODEL],
    parts: [
      { text: params.prompt },
      { inlineData: { mimeType: params.referenceImage.mimeType, data: params.referenceImage.base64 } },
    ],
    aspectRatio: params.aspectRatio || "16:9",
    imageSize: (params.resolution || "2K").toUpperCase(),
    responseModalities: ["IMAGE"],
    timeoutMs: 240_000,
    retries: 0,
  });
  return { base64: image.base64, mimeType: image.mimeType };
}

/** 모델 응답에서 ```json ... ``` 코드펜스나 잡텍스트를 걷어내고 JSON을 파싱한다. */
export function parseJsonFromModelText<T>(text: string): T {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/, "")
    .replace(/```\s*$/, "");
  return JSON.parse(cleaned) as T;
}
