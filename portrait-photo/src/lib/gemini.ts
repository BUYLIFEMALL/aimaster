// [이미지 모델 교체 2026-10-17] 구형(gemini-2.5-flash-image·gemini-3.1-flash-image·*-preview) → 최신 정식(gemini-nano-banana-2.1·gemini-3-pro-image·경량 1K는 gemini-3.1-flash-lite-image), 기준: ai-image-studio v1.11 lib/providers/adapters/gemini.ts.
// 실제 이미지 생성 시험은 하지 않았음 — 이미지 생성 오류가 나면 그때 테스트 검증한다(주인님 지시).
import "server-only";
import { GoogleGenAI } from "@google/genai";
import { GeminiImageError, generateGeminiImage } from "./geminiImage";
import type { AspectRatio, ModelLevel, Resolution } from "@/lib/portrait/options";

// 모델명은 자주 바뀌므로 한곳에서 관리한다. pro를 쓸 수 없으면 flash로 한 번 더 시도한다.
export const IMAGE_MODELS: Record<ModelLevel, string> = {
  flash: "gemini-3.1-flash-lite-image",
  pro: "gemini-3-pro-image",
};
export const TEXT_MODEL = "gemini-2.5-flash";

export type AiErrorCode = "key" | "quota" | "timeout" | "safety" | "noimage" | "unknown";
export class AiError extends Error {
  constructor(public code: AiErrorCode, message = "") { super(message); }
}

/** 어떤 예외든 사용자에게 보여줄 한국어 메시지와 HTTP 상태로 바꾼다(키·이미지 값은 절대 포함하지 않는다) */
export function toUserError(e: unknown): { code: AiErrorCode; message: string; status: number } {
  const table: Record<AiErrorCode, { message: string; status: number }> = {
    key: { message: "등록한 Gemini API 키가 올바르지 않거나 이미지 생성 권한이 없습니다. [API키등록·플랫폼연동]에서 키를 확인해 주세요.", status: 400 },
    quota: { message: "Gemini 사용 한도를 초과했습니다. 잠시 후 다시 시도하거나 본인 Google 계정의 한도·결제 설정을 확인해 주세요.", status: 429 },
    timeout: { message: "AI 응답이 늦어 중단되었습니다. 잠시 후 다시 시도하거나 모델을 ‘빠른 생성’으로 바꿔 보세요.", status: 504 },
    safety: { message: "AI 안전 필터가 이 사진 또는 옵션의 처리를 거부했습니다. 정면이 잘 나온 밝은 사진으로 다시 시도해 주세요.", status: 422 },
    noimage: { message: "AI가 이미지를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.", status: 502 },
    unknown: { message: "AI 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.", status: 500 },
  };
  // 메시지를 넣어 던진 AiError(공용 이미지 모듈의 시간 초과 표준 안내 등)는 그 메시지를 보여 준다
  if (e instanceof AiError) return { code: e.code, ...table[e.code], ...(e.message ? { message: e.message } : {}) };
  const raw = (e instanceof Error ? e.message : String(e ?? "")).toLowerCase();
  if (/api key|api_key|permission|unauthenticated|\b401\b|\b403\b/.test(raw)) return { code: "key", ...table.key };
  if (/quota|resource_exhausted|\b429\b|rate/.test(raw)) return { code: "quota", ...table.quota };
  if (/timeout|deadline|\b503\b|\b504\b|unavailable|abort/.test(raw)) return { code: "timeout", ...table.timeout };
  return { code: "unknown", ...table.unknown };
}

/** 공용 이미지 모듈 오류 → 이 프로그램의 AiError(시간 초과·연결 오류는 공용 안내 문구 사용) */
function fromImageError(e: GeminiImageError): AiError {
  switch (e.code) {
    case "INVALID_KEY": case "PERMISSION_DENIED": case "API_NOT_ENABLED": return new AiError("key");
    case "QUOTA_EXCEEDED": case "RATE_LIMITED": return new AiError("quota");
    case "SAFETY_BLOCKED": return new AiError("safety");
    case "NO_IMAGE": case "MODEL_NOT_FOUND": return new AiError("noimage");
    case "TIMEOUT": case "NETWORK": case "SERVER_ERROR": return new AiError("timeout", e.message);
    default: return new AiError("unknown");
  }
}

export interface PortraitImage { data: string; mimeType: string }

/** 이미지 생성에 쓸 수 있는 전체 시간(라우트 함수 한도 120초 − 여유) */
const IMAGE_BUDGET_MS = 105_000;

/**
 * 인물 사진 1장 생성. pro 모델이 없으면 flash로 폴백한다(imageSize는 pro에서만 쓴다).
 * 2026-10-18: 호출·대기·이미지 받기는 공용 기준 코드 gemini-image-client(./geminiImage — 기준은 ai-image-studio).
 * 두 번 호출해도 105초 안에서 남은 시간만 쓰고, 유료 생성이라 재시도 없음(이중 과금 방지). 모델·비율·화질·프롬프트는 그대로.
 */
export async function generatePortrait(o: {
  apiKey: string; base64: string; mimeType: string; prompt: string; aspect: AspectRatio; resolution: Resolution; level: ModelLevel;
}): Promise<PortraitImage & { model: string }> {
  const deadline = Date.now() + IMAGE_BUDGET_MS;
  const run = async (level: ModelLevel) => {
    const model = IMAGE_MODELS[level];
    const image = await generateGeminiImage({
      apiKey: o.apiKey,
      modelName: model,
      parts: [{ inlineData: { data: o.base64, mimeType: o.mimeType } }, { text: o.prompt }],
      aspectRatio: o.aspect,
      imageSize: level === "pro" ? o.resolution : undefined,
      timeoutMs: Math.max(15_000, deadline - Date.now()),
      retries: 0,
    });
    return { data: image.base64, mimeType: image.mimeType || "image/png", model };
  };
  try {
    return await run(o.level);
  } catch (e) {
    if (!(e instanceof GeminiImageError)) throw e;
    if (o.level === "pro" && e.code === "MODEL_NOT_FOUND" && deadline - Date.now() > 15_000) {
      try { return await run("flash"); } catch (e2) { if (e2 instanceof GeminiImageError) throw fromImageError(e2); throw e2; }
    }
    throw fromImageError(e);
  }
}

/** 키 확인용 아주 작은 텍스트 호출(본인 키 사용량 1회) */
export async function generatePlain(o: { apiKey: string; system: string; user: string; maxOutputTokens?: number }): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: o.apiKey });
  const res = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: o.user,
    config: { systemInstruction: o.system, maxOutputTokens: o.maxOutputTokens ?? 256 },
  });
  const text = (res.text ?? "").trim();
  if (!text) throw new AiError("noimage");
  return text;
}

export interface HeadMeasure { found: boolean; crownY: number; chinY: number; centerX: number }

/** 정수리(머리카락 제외 최상부)와 턱 끝의 세로 위치를 이미지 높이 대비 0~1로 추정한다. */
export async function detectHead(apiKey: string, base64: string, mimeType: string): Promise<HeadMeasure> {
  const ai = new GoogleGenAI({ apiKey });
  const res = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: {
      parts: [
        { inlineData: { data: base64, mimeType } },
        { text: "This is an ID-style portrait photo. Estimate the vertical position of two landmarks as fractions of the full image height (0 = top edge, 1 = bottom edge): crownY = the top of the skull/head (the highest point of the head, ignoring any hair volume or hair tufts above the skull when possible), chinY = the bottom of the chin, centerX = the horizontal center of the face (between the eyes) as a fraction of the full image width (0 = left edge, 1 = right edge). If there is no single clearly visible face, set found=false and both values 0. Respond only with JSON." },
      ],
    },
    config: {
      temperature: 0,
      maxOutputTokens: 1024,
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: { found: { type: "BOOLEAN" }, crownY: { type: "NUMBER" }, chinY: { type: "NUMBER" }, centerX: { type: "NUMBER" } },
        required: ["found", "crownY", "chinY", "centerX"],
      } as never,
    },
  });
  let parsed: { found?: unknown; crownY?: unknown; chinY?: unknown; centerX?: unknown } = {};
  try { parsed = JSON.parse((res.text ?? "").trim()); } catch { /* 아래에서 처리 */ }
  const crown = Number(parsed.crownY);
  const chin = Number(parsed.chinY);
  const cx = Number(parsed.centerX);
  const ok = parsed.found === true && Number.isFinite(crown) && Number.isFinite(chin) && crown >= 0 && chin <= 1 && chin > crown + 0.05;
  if (!ok) return { found: false, crownY: 0, chinY: 0, centerX: 0.5 };
  return { found: true, crownY: crown, chinY: chin, centerX: Number.isFinite(cx) && cx > 0.05 && cx < 0.95 ? cx : 0.5 };
}
