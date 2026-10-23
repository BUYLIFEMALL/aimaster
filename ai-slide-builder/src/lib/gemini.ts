import { GoogleGenAI } from "@google/genai";
import {
  GEMINI_SYSTEM_PROMPT_STANDARD,
  GEMINI_SYSTEM_PROMPT_KIMURA,
  GEMINI_SYSTEM_PROMPT_GPT_PARK,
  GEMINI_SLIDE_REGEN_PROMPT,
  GEMINI_DOCUMENT_ANALYSIS_PROMPT,
} from "./constants";
import { PromptFormat } from "./types";

const MODEL_NAME = "gemini-2.5-flash";

export interface GeminiSlideResponse {
  jsonString: string;
}

export async function getGeminiSlideResponse(
  apiKey: string,
  prompt: string,
  format: PromptFormat,
  useWebSearch: boolean
): Promise<GeminiSlideResponse> {
  if (!apiKey || !apiKey.trim()) {
    throw new Error("Gemini API 키가 등록되지 않았습니다. 좌측 상단에서 본인의 API 키를 등록해주세요.");
  }

  const ai = new GoogleGenAI({ apiKey: apiKey.trim() });

  const systemInstruction =
    format === "kimura"
      ? GEMINI_SYSTEM_PROMPT_KIMURA
      : format === "gpt_park"
      ? GEMINI_SYSTEM_PROMPT_GPT_PARK
      : GEMINI_SYSTEM_PROMPT_STANDARD;

  const config: { systemInstruction: string; tools?: any[] } = {
    systemInstruction,
  };

  if (useWebSearch) {
    config.tools = [{ googleSearch: {} }];
  }

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config,
    });

    let jsonString = response.text || "";
    const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/;
    const match = jsonString.match(codeBlockRegex);
    if (match) {
      jsonString = match[1];
    }

    return { jsonString: jsonString.trim() };
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
      throw new Error(`Gemini API 통신 오류: ${error.message}`);
    }
    throw new Error("Gemini API 통신 중 알 수 없는 오류가 발생했습니다.");
  }
}

export async function analyzeDocumentWithGemini(
  apiKey: string,
  content: string | any[]
): Promise<string> {
  if (!apiKey || !apiKey.trim()) {
    throw new Error("Gemini API 키가 등록되지 않았습니다.");
  }

  const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
  const requestContents = Array.isArray(content) ? { parts: content } : content;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: requestContents,
      config: {
        systemInstruction: GEMINI_DOCUMENT_ANALYSIS_PROMPT,
      },
    });

    return (response.text || "").trim();
  } catch (error) {
    console.error("Error calling Gemini API for analysis:", error);
    if (error instanceof Error) {
      throw new Error(`문서 분석 중 Gemini API 오류: ${error.message}`);
    }
    throw new Error("문서 분석 중 알 수 없는 오류가 발생했습니다.");
  }
}

export async function regenerateSlideWithGemini(
  apiKey: string,
  slide: any,
  userRequest: string
): Promise<any> {
  if (!apiKey || !apiKey.trim()) {
    throw new Error("Gemini API 키가 등록되지 않았습니다.");
  }

  const ai = new GoogleGenAI({ apiKey: apiKey.trim() });

  const prompt = `
기존 슬라이드 JSON:
\`\`\`json
${JSON.stringify(slide, null, 2)}
\`\`\`

사용자 수정 요청:
"${userRequest}"

위 요청에 맞춰 슬라이드 JSON을 수정하여 단일 JSON 객체로 반환해주세요.
`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: GEMINI_SLIDE_REGEN_PROMPT,
      },
    });

    let jsonString = (response.text || "").trim();
    const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/;
    const match = jsonString.match(codeBlockRegex);
    if (match) {
      jsonString = match[1].trim();
    }

    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Error calling Gemini API for slide regeneration:", error);
    if (error instanceof Error) {
      throw new Error(`슬라이드 수정 중 Gemini API 오류: ${error.message}`);
    }
    throw new Error("슬라이드 수정 중 알 수 없는 오류가 발생했습니다.");
  }
}
