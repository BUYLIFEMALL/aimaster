// [이미지 모델 교체 2026-10-17] 구형(gemini-2.5-flash-image·gemini-3.1-flash-image·*-preview) → 최신 정식(gemini-nano-banana-2.1·gemini-3-pro-image·경량 1K는 gemini-3.1-flash-lite-image), 기준: ai-image-studio v1.11 lib/providers/adapters/gemini.ts.
// 실제 이미지 생성 시험은 하지 않았음 — 이미지 생성 오류가 나면 그때 테스트 검증한다(주인님 지시).
import "server-only";
import { GoogleGenAI, Type } from "@google/genai";
import { GeminiImageError, generateGeminiImage } from "./geminiImage";
import type { AISuggestion, AspectRatio, BackgroundMode, BeautyAdvice, BeautyType, ImageState, Lang, ModelLevel, SuggestionKind } from "@/lib/look/types";
import { beautyAdvicePrompt, beautyApplyPrompt, itemImagePrompt, itemNamePrompt, recommendPrompt, tryOnPrompt } from "@/lib/look/prompts";
import { parseBeauty, parseSuggestions } from "@/lib/look/validate";

// 모델 구성은 한곳에서 관리한다(모델명은 자주 바뀐다). pro가 계정에서 쓸 수 없으면 standard로 자동 폴백한다.
export const MODELS: Record<ModelLevel, { text: string; image: string }> = {
  standard: { text: "gemini-2.5-flash", image: "gemini-3.1-flash-lite-image" },
  // v1.11: 미리보기(gemini-3-pro-preview) → 정식 최신 Flash(저장소 ai-auto-blog 모델 표 lifecycle stable). 쓸 수 없으면 기존처럼 standard로 폴백
  pro: { text: "gemini-3.8-flash", image: "gemini-nano-banana-2.1" },
};

export type AiErrorCode = "key" | "quota" | "safety" | "noimage" | "timeout" | "parse" | "unknown";
export class AiError extends Error {
  constructor(public code: AiErrorCode, message: string) { super(message); }
}

/** 어떤 예외든 사용자에게 보여줄 한국어 메시지와 HTTP 상태로 바꾼다(키·이미지 값은 포함하지 않는다) */
export function toUserError(e: unknown): { code: AiErrorCode; message: string; status: number } {
  if (e instanceof GeminiImageError) return toUserError(fromImageError(e));
  if (e instanceof AiError) {
    const map: Record<AiErrorCode, { message: string; status: number }> = {
      key: { message: "등록한 Gemini API 키가 올바르지 않거나 이 기능을 쓸 권한이 없습니다. [API키등록·플랫폼연동]에서 키를 확인해 주세요.", status: 400 },
      quota: { message: "Gemini 사용 한도를 초과했습니다. 잠시 후 다시 시도하거나 본인 Google 계정의 한도를 확인해 주세요.", status: 429 },
      safety: { message: "AI의 안전 필터가 이 사진 또는 요청의 처리를 거부했습니다. 정면이 잘 나온 밝은 사진, 노출이 과하지 않은 아이템으로 다시 시도해 주세요.", status: 422 },
      noimage: { message: "AI가 이미지를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.", status: 502 },
      timeout: { message: "AI 응답이 늦어 중단되었습니다. 잠시 후 다시 시도해 주세요.", status: 504 },
      parse: { message: "AI 응답을 이해하지 못했습니다. 다시 시도해 주세요.", status: 502 },
      unknown: { message: "AI 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.", status: 500 },
    };
    // 메시지를 넣어 던진 AiError(공용 이미지 모듈의 시간 초과 표준 안내 등)는 그 메시지를 보여 준다
    return { code: e.code, ...map[e.code], ...(e.message ? { message: e.message } : {}) };
  }
  const raw = (e instanceof Error ? e.message : String(e ?? "")).toLowerCase();
  if (/api key|api_key|permission|unauthenticated|\b401\b|\b403\b|invalid argument.*key/.test(raw)) return toUserError(new AiError("key", ""));
  if (/quota|resource_exhausted|\b429\b|rate/.test(raw)) return toUserError(new AiError("quota", ""));
  if (/timeout|deadline|\b503\b|\b504\b|unavailable|abort/.test(raw)) return toUserError(new AiError("timeout", ""));
  return toUserError(new AiError("unknown", ""));
}

function isModelUnavailable(e: unknown): boolean {
  const raw = (e instanceof Error ? e.message : String(e ?? "")).toLowerCase();
  return /not found|\b404\b|is not supported|unsupported model|does not exist/.test(raw);
}

/** pro 모델이 없으면 standard로 한 번 더 시도한다 */
async function withModelFallback<T>(level: ModelLevel, run: (m: { text: string; image: string }) => Promise<T>): Promise<T> {
  try {
    return await run(MODELS[level]);
  } catch (e) {
    const unavailable = e instanceof GeminiImageError ? e.code === "MODEL_NOT_FOUND" : isModelUnavailable(e);
    if (level === "pro" && unavailable) return run(MODELS.standard);
    throw e;
  }
}

function clientFor(apiKey: string) {
  return new GoogleGenAI({ apiKey });
}

type Part = { text: string } | { inlineData: { data: string; mimeType: string } };

/** 공용 이미지 모듈 오류 → 이 프로그램의 AiError(시간 초과·연결 오류는 공용 안내 문구 사용) */
function fromImageError(e: GeminiImageError): AiError {
  switch (e.code) {
    case "INVALID_KEY": case "PERMISSION_DENIED": case "API_NOT_ENABLED": return new AiError("key", "");
    case "QUOTA_EXCEEDED": case "RATE_LIMITED": return new AiError("quota", "");
    case "SAFETY_BLOCKED": return new AiError("safety", "");
    case "NO_IMAGE": case "MODEL_NOT_FOUND": return new AiError("noimage", "");
    case "TIMEOUT": case "NETWORK": case "SERVER_ERROR": return new AiError("timeout", e.message);
    default: return new AiError("unknown", "");
  }
}

/** 이미지 라우트 함수 한도 300초(2026-10-18 60초에서 상향) − 여유: 한 요청(폴백 포함)에서 이미지 호출에 쓸 수 있는 시간 */
const IMAGE_BUDGET_MS = 240_000;

/**
 * 2026-10-18: 호출·대기·이미지 받기는 공용 기준 코드 gemini-image-client(./geminiImage — 기준은 ai-image-studio).
 * 마감 시각까지 남은 시간만 쓰고, 유료 생성이라 재시도 없음(이중 과금 방지). 오류는 GeminiImageError로 던지고 toUserError가 문구로 바꾼다.
 * 모델·비율·프롬프트는 그대로.
 */
async function generateImage(apiKey: string, model: string, parts: Part[], aspectRatio: AspectRatio, deadline: number): Promise<ImageState> {
  const image = await generateGeminiImage({
    apiKey,
    modelName: model,
    parts,
    aspectRatio,
    timeoutMs: Math.max(10_000, deadline - Date.now()),
    retries: 0,
  });
  return { data: image.base64, mimeType: image.mimeType || "image/png" };
}

const piecesSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: "세트 이름" },
      pieces: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: { name: { type: Type.STRING }, imagePrompt: { type: Type.STRING } },
          required: ["name", "imagePrompt"],
        },
      },
    },
    required: ["name", "pieces"],
  },
};

function parseJsonText(text: string | undefined): unknown {
  if (!text) throw new AiError("parse", "");
  try { return JSON.parse(text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "")); } catch { throw new AiError("parse", ""); }
}

export async function recommend(apiKey: string, image: ImageState, situation: string, kind: SuggestionKind, level: ModelLevel): Promise<AISuggestion[]> {
  return withModelFallback(level, async (m) => {
    const res = await clientFor(apiKey).models.generateContent({
      model: m.text,
      contents: { parts: [{ inlineData: image }, { text: recommendPrompt(kind, situation, new Date().getFullYear()) }] },
      config: { responseMimeType: "application/json", responseSchema: piecesSchema },
    });
    const parsed = parseSuggestions(parseJsonText(res.text));
    if (!parsed) throw new AiError("parse", "");
    return parsed;
  });
}

/** 아이템(옷·액세서리) 이미지는 비용을 아끼려고 항상 standard 이미지 모델을 쓴다 */
export async function itemImage(apiKey: string, prompt: string): Promise<ImageState> {
  return generateImage(apiKey, MODELS.standard.image, [{ text: itemImagePrompt(prompt) }], "1:1", Date.now() + IMAGE_BUDGET_MS);
}

export async function itemName(apiKey: string, image: ImageState): Promise<string> {
  const res = await clientFor(apiKey).models.generateContent({
    model: MODELS.standard.text,
    contents: { parts: [{ inlineData: image }, { text: itemNamePrompt() }] },
  });
  return (res.text ?? "").replace(/["'`\n]/g, " ").replace(/\s+/g, " ").trim().slice(0, 40);
}

export async function tryOn(
  apiKey: string, base: ImageState, item: ImageState, aspect: AspectRatio, background: BackgroundMode, situation: string | undefined, level: ModelLevel,
): Promise<ImageState> {
  const deadline = Date.now() + IMAGE_BUDGET_MS;
  return withModelFallback(level, (m) =>
    generateImage(apiKey, m.image, [{ inlineData: base }, { inlineData: item }, { text: tryOnPrompt(background, situation) }], aspect, deadline),
  );
}

export async function beautyAdvice(apiKey: string, image: ImageState, lang: Lang, level: ModelLevel): Promise<BeautyAdvice> {
  const part = {
    type: Type.OBJECT,
    properties: { title: { type: Type.STRING }, description: { type: Type.STRING }, imagePrompt: { type: Type.STRING } },
    required: ["title", "description", "imagePrompt"],
  };
  return withModelFallback(level, async (m) => {
    const res = await clientFor(apiKey).models.generateContent({
      model: m.text,
      contents: { parts: [{ inlineData: image }, { text: beautyAdvicePrompt(lang, new Date().getFullYear()) }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: { type: Type.OBJECT, properties: { makeup: part, hairstyle: part }, required: ["makeup", "hairstyle"] },
      },
    });
    const parsed = parseBeauty(parseJsonText(res.text));
    if (!parsed) throw new AiError("parse", "");
    return parsed;
  });
}

export async function beautyApply(apiKey: string, image: ImageState, type: BeautyType, description: string, aspect: AspectRatio, level: ModelLevel): Promise<ImageState> {
  const deadline = Date.now() + IMAGE_BUDGET_MS;
  return withModelFallback(level, (m) =>
    generateImage(apiKey, m.image, [{ inlineData: image }, { text: beautyApplyPrompt(type, description) }], aspect, deadline),
  );
}
