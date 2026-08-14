import "server-only";

// n8n 워크플로우가 실제 운영에서 쓰던 모델 이름을 그대로 사용한다.
// - 상품분석(텍스트/비전): #0.상세페이지 자동화v2 | 상품분석.json → models/gemini-3.5-flash
// - 이미지 생성(나노바나나 프로, image-to-image): #1/#3 워크플로우 → gemini-3-pro-image-preview
const ANALYSIS_MODEL = "gemini-3.5-flash";
const IMAGE_MODEL = "gemini-3-pro-image-preview";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

async function callGemini(model: string, body: Record<string, unknown>, apiKey: string) {
  const res = await fetch(`${API_BASE}/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  if (!res.ok) {
    const message = json?.error?.message ?? `Gemini API 오류 (HTTP ${res.status})`;
    throw new Error(message);
  }
  return json;
}

/** 이미지 URL을 base64 데이터로 변환 (Gemini inlineData 파트에 넣기 위함). */
export async function fetchImageAsBase64(
  imageUrl: string,
): Promise<{ base64: string; mimeType: string }> {
  const res = await fetch(imageUrl);
  if (!res.ok) {
    throw new Error(`참조 이미지를 가져오지 못했습니다 (HTTP ${res.status}).`);
  }
  const mimeType = res.headers.get("content-type") ?? "image/png";
  const buffer = Buffer.from(await res.arrayBuffer());
  return { base64: buffer.toString("base64"), mimeType };
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

/** 섹션 이미지 생성: 완성 프롬프트 + 원본이미지(base64)를 나노바나나 프로에 image-to-image로 요청. */
export async function generateSectionImageWithGemini(params: {
  prompt: string;
  referenceImage: { base64: string; mimeType: string };
  aspectRatio: string;
  resolution: string;
  apiKey: string;
}): Promise<{ base64: string; mimeType: string }> {
  const json = await callGemini(
    IMAGE_MODEL,
    {
      contents: [
        {
          parts: [
            { text: params.prompt },
            {
              inlineData: {
                mimeType: params.referenceImage.mimeType,
                data: params.referenceImage.base64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ["IMAGE"],
        imageConfig: {
          aspectRatio: params.aspectRatio || "16:9",
          imageSize: (params.resolution || "2K").toUpperCase(),
        },
      },
    },
    params.apiKey,
  );

  const imagePart = json?.candidates?.[0]?.content?.parts?.find(
    (p: GeminiPart) => p.inlineData?.data,
  );
  if (!imagePart?.inlineData) {
    throw new Error("이미지 생성 응답에서 이미지 데이터를 찾지 못했습니다.");
  }
  return { base64: imagePart.inlineData.data, mimeType: imagePart.inlineData.mimeType };
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
