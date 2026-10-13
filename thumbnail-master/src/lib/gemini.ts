import "server-only";
import { GoogleGenAI } from "@google/genai";
import type { Inputs, Strategy } from "@/lib/tmb/types";
import { strategySystem, strategyUser } from "@/lib/tmb/prompts";
import { normalizeStrategy, parseJsonLoose, responseSchema } from "@/lib/tmb/strategy";

// 모델명은 자주 바뀌므로 한곳에서 관리한다. 앞 모델을 쓸 수 없으면 다음 모델로 자동 폴백한다.
export const TEXT_MODELS = ["gemini-3.5-flash", "gemini-2.5-flash"];
export const IMAGE_MODELS = ["gemini-3-pro-image-preview", "gemini-2.5-flash-image"];

export type AiErrorCode = "key" | "quota" | "timeout" | "parse" | "safety" | "noimage" | "unknown";
export class AiError extends Error {
  constructor(public code: AiErrorCode, message = "") { super(message); }
}

/** 어떤 예외든 사용자에게 보여줄 한국어 메시지와 HTTP 상태로 바꾼다(키 값은 절대 포함하지 않는다) */
export function toUserError(e: unknown): { code: AiErrorCode; message: string; status: number } {
  const table: Record<AiErrorCode, { message: string; status: number }> = {
    key: { message: "등록한 Gemini API 키가 올바르지 않거나 이미지 생성 권한이 없습니다. [API키등록·플랫폼연동]에서 키와 결제 설정을 확인해 주세요.", status: 400 },
    quota: { message: "Gemini 사용 한도를 초과했습니다. 잠시 후 다시 시도하거나 본인 Google 계정의 한도를 확인해 주세요.", status: 429 },
    timeout: { message: "AI 응답이 늦어 중단되었습니다. 잠시 후 다시 시도해 주세요.", status: 504 },
    parse: { message: "AI가 올바른 형식으로 응답하지 못했습니다. 다시 시도해 주세요.", status: 502 },
    safety: { message: "AI 안전 정책으로 이미지를 만들지 못했습니다. 인물·문구 설정을 바꿔 다시 시도해 주세요.", status: 422 },
    noimage: { message: "이미지가 만들어지지 않았습니다. 같은 버튼을 한 번 더 눌러 주세요. 계속되면 문구를 줄이거나 \"문구 없이 배경만\" 옵션을 써 보세요.", status: 502 },
    unknown: { message: "AI 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.", status: 500 },
  };
  if (e instanceof AiError) return { code: e.code, ...table[e.code] };
  const raw = (e instanceof Error ? e.message : String(e ?? "")).toLowerCase();
  if (/api key|api_key|permission|unauthenticated|\b401\b|\b403\b/.test(raw)) return { code: "key", ...table.key };
  if (/quota|resource_exhausted|\b429\b|rate/.test(raw)) return { code: "quota", ...table.quota };
  if (/timeout|deadline|\b503\b|\b504\b|unavailable|abort/.test(raw)) return { code: "timeout", ...table.timeout };
  return { code: "unknown", ...table.unknown };
}

function isModelUnavailable(e: unknown): boolean {
  const raw = (e instanceof Error ? e.message : String(e ?? "")).toLowerCase();
  return /not found|\b404\b|is not supported|unsupported model|does not exist/.test(raw);
}

/** 전략(A/B 문구·이미지 프롬프트) 생성. JSON 형식이 어긋나면 모델당 한 번 더 시도한다. */
export async function makeStrategy(apiKey: string, inputs: Inputs, docText: string, avoid?: string[]): Promise<Strategy> {
  const ai = new GoogleGenAI({ apiKey });
  let last: unknown;
  for (const model of TEXT_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await ai.models.generateContent({
          model,
          contents: strategyUser(inputs.topic, docText, avoid),
          config: {
            systemInstruction: strategySystem(inputs),
            temperature: avoid?.length ? 0.9 : 0.7,
            responseMimeType: "application/json",
            responseSchema: responseSchema as never,
          },
        });
        const s = normalizeStrategy(parseJsonLoose(res.text));
        if (s) return s;
        last = new AiError("parse");
      } catch (e) {
        last = e;
        if (isModelUnavailable(e)) break;
        if (!(e instanceof AiError)) throw e;
      }
    }
  }
  throw last ?? new AiError("unknown");
}

export interface ImagePart { text?: string; image?: { mime: string; data: Buffer } }

/** 이미지 1장 생성/수정. 앞 모델을 쓸 수 없으면 다음 모델로 폴백한다. */
export async function makeImage(apiKey: string, parts: ImagePart[], size: "1K" | "2K"): Promise<{ bytes: Buffer; model: string }> {
  const ai = new GoogleGenAI({ apiKey });
  const apiParts = parts.map((p) => (p.image ? { inlineData: { mimeType: p.image.mime, data: p.image.data.toString("base64") } } : { text: p.text ?? "" }));
  let last: unknown;
  for (const model of IMAGE_MODELS) {
    try {
      const imageConfig = model === IMAGE_MODELS[0] ? { aspectRatio: "16:9", imageSize: size } : { aspectRatio: "16:9" };
      const res = await ai.models.generateContent({ model, contents: [{ role: "user", parts: apiParts }], config: { imageConfig } as never });
      if (res.promptFeedback?.blockReason) throw new AiError("safety");
      for (const p of res.candidates?.[0]?.content?.parts ?? []) {
        if (p.inlineData?.data) return { bytes: Buffer.from(p.inlineData.data, "base64"), model };
      }
      const reason = res.candidates?.[0]?.finishReason;
      if (reason === "SAFETY" || reason === "PROHIBITED_CONTENT" || reason === "IMAGE_SAFETY") throw new AiError("safety");
      last = new AiError("noimage");
    } catch (e) {
      last = e;
      if (e instanceof AiError && e.code === "safety") throw e;
      if (isModelUnavailable(e)) continue;
      throw e;
    }
  }
  throw last ?? new AiError("noimage");
}
