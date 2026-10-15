import { GoogleGenAI } from "@google/genai";

function koreaNowRule(now = new Date()): string {
  const [year, month] = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit" }).format(now).split("-").map(Number);
  return `[기준 시점: 한국 시간으로 지금은 ${year}년 ${month}월입니다. 계절·시기 표현은 현재 월에 맞추고, 연도·계절은 불필요하게 덧붙이지 마세요.]`;
}

export interface ApiKeyValidationResult {
  isValid: boolean;
  canGenerateText: boolean;
  canGenerateStandard: boolean;
  canGeneratePro: boolean;
  error?: string;
}

export interface ImageReference {
  data: string; // base64 without prefix or mime
  mimeType: string;
}

export interface GenerateOptions {
  aspectRatio: string; // "1:1", "16:9", "9:16", "4:3", "3:4"
  resolution?: string; // "1K", "2K", "4K"
  maintainSubject?: boolean;
  style?: string;
}

// 1. API 키 권한 및 유효성 진단
export async function validateGeminiApiKey(apiKey: string): Promise<ApiKeyValidationResult> {
  const ai = new GoogleGenAI({ apiKey });
  const result: ApiKeyValidationResult = {
    isValid: false,
    canGenerateText: false,
    canGenerateStandard: false,
    canGeneratePro: false,
  };

  try {
    await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [{ text: "ping" }] },
    });
    result.canGenerateText = true;
    result.isValid = true;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    result.error = errorMsg;
    return result;
  }

  // 표준 이미지 테스트
  try {
    await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: { parts: [{ text: "dot" }] },
      config: { imageConfig: { aspectRatio: "1:1" } } as unknown as Record<string, unknown>,
    });
    result.canGenerateStandard = true;
  } catch {
    // Standard Image 미지원 또는 할당량 초과
  }

  // Pro 이미지 테스트
  try {
    await ai.models.generateContent({
      model: "gemini-3.1-flash-image-preview",
      contents: { parts: [{ text: "dot" }] },
      config: { imageConfig: { aspectRatio: "1:1" } } as unknown as Record<string, unknown>,
    });
    result.canGeneratePro = true;
  } catch {
    // Pro Image 미지원
  }

  return result;
}

// 2. 신규 이미지 생성 엔진
export async function generateGraphicImage(
  apiKey: string,
  prompt: string,
  options: GenerateOptions,
  referenceImages: ImageReference[] = [],
  modelTier: "standard" | "pro" = "standard"
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  const modelName = modelTier === "pro" ? "gemini-3.1-flash-image-preview" : "gemini-2.5-flash-image";

  const parts: Array<Record<string, unknown>> = [];

  // 레퍼런스 이미지 주입
  if (referenceImages.length > 0) {
    for (const ref of referenceImages) {
      parts.push({
        inlineData: {
          mimeType: ref.mimeType,
          data: ref.data,
        },
      });
    }

    if (options.maintainSubject) {
      parts.push({
        text: "Instruction: Use the attached image(s) as a direct reference. Maintain the exact physical appearance, facial features, and identity of the subject in the reference image(s).",
      });
    } else {
      parts.push({
        text: "Instruction: Use the attached image(s) primarily for style, vibe, or composition reference. You do not need to strictly maintain the subject's identity.",
      });
    }
  }

  // 메인 프롬프트
  parts.push({ text: prompt });

  const imageConfig: Record<string, unknown> = {
    aspectRatio: options.aspectRatio || "1:1",
  };

  if (modelTier === "pro" && options.resolution) {
    imageConfig.imageSize = options.resolution;
  }

  const response = await ai.models.generateContent({
    model: modelName,
    contents: { parts } as unknown as Record<string, unknown>,
    config: { imageConfig } as unknown as Record<string, unknown>,
  });

  const candidates = response.candidates;
  if (candidates && candidates[0]?.content?.parts) {
    for (const part of candidates[0].content.parts) {
      if (part.inlineData?.data) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  }

  throw new Error("이미지 데이터가 생성되지 않았습니다.");
}

// 3. 인페인팅 및 아웃페인팅 편집 엔진
export async function editGraphicImage(
  apiKey: string,
  prompt: string,
  baseImageBase64: string,
  maskImageBase64: string | null,
  options: GenerateOptions,
  modelTier: "standard" | "pro" = "pro",
  referenceImages: ImageReference[] = []
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  const modelName = modelTier === "pro" ? "gemini-3.1-flash-image-preview" : "gemini-2.5-flash-image";

  const cleanBase = baseImageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, "");
  const parts: Array<Record<string, unknown>> = [
    {
      inlineData: {
        data: cleanBase,
        mimeType: "image/png",
      },
    },
  ];

  if (referenceImages.length > 0) {
    for (const ref of referenceImages) {
      parts.push({
        inlineData: {
          mimeType: ref.mimeType,
          data: ref.data,
        },
      });
    }
  }

  if (maskImageBase64) {
    const cleanMask = maskImageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, "");
    parts.push({
      inlineData: {
        data: cleanMask,
        mimeType: "image/png",
      },
    });

    parts.push({
      text: `[System Instruction for In-painting]
You are an expert image editor. Perform the edit STRICTLY within the masked area.
[Mask Definitions]
- White pixels (255): The ACTIVE EDITING ZONE. You MUST change the content here.
- Black pixels (0): The PROTECTED ZONE. Do NOT change this area.
[Action Rules]
1. Focus ONLY on the White Mask area.
2. If the user asks to "replace" or "change" an object:
   - If the masked area contains an object, replace it.
   - If the masked area is empty, ADD/GENERATE the requested object in that space.
3. If the user asks to "remove", fill the mask seamlessly with the surrounding background context.
User Prompt: ${prompt}`,
    });
  } else {
    parts.push({ text: prompt });
  }

  const imageConfig: Record<string, unknown> = {
    aspectRatio: options.aspectRatio || "1:1",
  };

  if (modelTier === "pro" && options.resolution) {
    imageConfig.imageSize = options.resolution;
  }

  const response = await ai.models.generateContent({
    model: modelName,
    contents: { parts } as unknown as Record<string, unknown>,
    config: { imageConfig } as unknown as Record<string, unknown>,
  });

  const candidates = response.candidates;
  if (candidates && candidates[0]?.content?.parts) {
    for (const part of candidates[0].content.parts) {
      if (part.inlineData?.data) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  }

  throw new Error("편집된 이미지 데이터가 반환되지 않았습니다.");
}

// 4. 기획서/레퍼런스 분석 기반 AI 자동 입력 (AI 입력 도우미)
export async function parseReferenceToFields(
  apiKey: string,
  referenceContent: string,
  fields: Array<{ id: string; label: string; placeholder?: string; options?: string[] }>
): Promise<Record<string, string>> {
  const ai = new GoogleGenAI({ apiKey });

  const currentYear = new Date().getFullYear();
  const fieldsDescription = fields
    .map((f) => `- ${f.id} (${f.label})${f.options ? ` [선택가능: ${f.options.join(", ")}]` : ""}`)
    .join("\n");

  const prompt = `당신은 대한민국 최고의 AI 그래픽 디자이너이자 기획서 분석가입니다.
현재 연도는 ${currentYear}년입니다.
${koreaNowRule()}
아래에 제공된 [참고 문서/메모 내용]을 면밀히 분석하여, [필요한 필드 목록]의 각 필드에 가장 적합한 값을 한국어 또는 영어(필요시)로 추출하여 JSON 형식으로 작성해주세요.

[필요한 필드 목록]
${fieldsDescription}

[참고 문서/메모 내용]
${referenceContent}

반드시 다음 형식의 JSON 객체만 반환하세요:
{
  "필드id": "추출된 최적의 값"
}`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: { parts: [{ text: prompt }] },
  });

  const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      // json parse fallback
    }
  }

  return {};
}
