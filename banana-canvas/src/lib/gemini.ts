// [이미지 모델 교체 2026-10-17] 구형(gemini-2.5-flash-image·gemini-3.1-flash-image·*-preview) → 최신 정식(gemini-nano-banana-2.1·gemini-3-pro-image·경량 1K는 gemini-3.1-flash-lite-image), 기준: ai-image-studio v1.11 lib/providers/adapters/gemini.ts.
// 실제 이미지 생성 시험은 하지 않았음 — 이미지 생성 오류가 나면 그때 테스트 검증한다(주인님 지시).
import "server-only";
import { GoogleGenAI } from "@google/genai";
import type { Aspect, ModelLevel } from "@/lib/bnc/types";

// 모델명은 자주 바뀌므로 한곳에서 관리한다. 앞 모델을 쓸 수 없으면 다음 모델로 자동 폴백한다.
export const TEXT_MODELS = ["gemini-3.5-flash", "gemini-2.5-flash"];
export const IMAGE_MODELS: Record<ModelLevel, string[]> = {
  flash: ["gemini-3.1-flash-lite-image", "gemini-3-pro-image"],
  pro: ["gemini-3-pro-image", "gemini-3.1-flash-lite-image"],
};

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
    safety: { message: "AI 안전 정책으로 이미지를 만들지 못했습니다. 다른 사진이나 표현으로 다시 시도해 주세요.", status: 422 },
    noimage: { message: "이미지가 만들어지지 않았습니다. 같은 버튼을 한 번 더 눌러 주세요. 계속되면 요청을 더 구체적으로 쓰거나 다른 사진을 써 보세요.", status: 502 },
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

export interface Part { text?: string; image?: { mime: string; data: Buffer } }
const toApi = (p: Part) => (p.image ? { inlineData: { mimeType: p.image.mime, data: p.image.data.toString("base64") } } : { text: p.text ?? "" });

/** 텍스트 모델 호출(프롬프트 제안·기획). json=true면 JSON 응답을 요구한다. */
export async function textModel(apiKey: string, parts: Part[], opts: { temperature?: number; json?: boolean } = {}): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  let last: unknown;
  for (const model of TEXT_MODELS) {
    try {
      const res = await ai.models.generateContent({
        model,
        contents: [{ role: "user", parts: parts.map(toApi) }],
        config: { temperature: opts.temperature ?? 0.7, ...(opts.json ? { responseMimeType: "application/json" } : {}) },
      });
      if (res.promptFeedback?.blockReason) throw new AiError("safety");
      const t = res.text?.trim();
      if (t) return t;
      last = new AiError("parse");
    } catch (e) {
      last = e;
      if (e instanceof AiError && e.code === "safety") throw e;
      if (isModelUnavailable(e)) continue;
      throw e;
    }
  }
  throw last ?? new AiError("unknown");
}

export interface ImageResult { images: { bytes: Buffer; mime: string }[]; texts: string[]; model: string }

/** 이미지 모델 호출. 응답의 이미지 파트를 모두 돌려준다(없으면 noimage/safety). */
export async function imageModel(
  apiKey: string,
  parts: Part[],
  opts: { model: ModelLevel; aspect?: Aspect; modalities: "image" | "image_text" },
): Promise<ImageResult> {
  const ai = new GoogleGenAI({ apiKey });
  let last: unknown;
  for (const model of IMAGE_MODELS[opts.model]) {
    try {
      const res = await ai.models.generateContent({
        model,
        contents: [{ role: "user", parts: parts.map(toApi) }],
        config: {
          responseModalities: opts.modalities === "image" ? ["IMAGE"] : ["IMAGE", "TEXT"],
          ...(opts.aspect ? { imageConfig: { aspectRatio: opts.aspect } } : {}),
        } as never,
      });
      if (res.promptFeedback?.blockReason) throw new AiError("safety");
      const images: ImageResult["images"] = [];
      const texts: string[] = [];
      for (const p of res.candidates?.[0]?.content?.parts ?? []) {
        if (p.inlineData?.data) images.push({ bytes: Buffer.from(p.inlineData.data, "base64"), mime: p.inlineData.mimeType ?? "image/png" });
        else if (p.text) texts.push(p.text);
      }
      if (images.length) return { images, texts, model };
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
