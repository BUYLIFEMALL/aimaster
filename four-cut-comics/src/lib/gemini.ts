import "server-only";
import { GoogleGenAI } from "@google/genai";
import { GeminiImageError, generateGeminiImage } from "./geminiImage";

// 모델명은 자주 바뀌므로 한곳에서 관리한다(이미지 모델 후보는 lib/comic/options.ts).
// v1.24: 별칭(gemini-flash-lite-latest — 가리키는 모델이 예고 없이 바뀜) → 고정 정식 이름
export const TEXT_MODEL = "gemini-3.5-flash-lite";

export type AiErrorCode = "key" | "quota" | "timeout" | "safety" | "noimage" | "model" | "badjson" | "unknown";
export class AiError extends Error {
  constructor(public code: AiErrorCode, message = "") { super(message); }
}

const TABLE: Record<AiErrorCode, { message: string; status: number }> = {
  key: { message: "등록한 Gemini API 키가 올바르지 않거나 이 기능을 쓸 권한이 없습니다. [API키등록·플랫폼연동]에서 키를 확인해 주세요.", status: 400 },
  quota: { message: "Gemini 사용 한도를 초과했습니다. 잠시 후 다시 시도하거나 본인 Google 계정의 한도·결제 설정을 확인해 주세요.", status: 429 },
  timeout: { message: "AI 응답이 늦어 중단되었습니다. 잠시 후 다시 시도하거나 ‘Lite’ 모델로 바꿔 보세요.", status: 504 },
  safety: { message: "AI 안전 필터가 이 장면의 그림을 거부했습니다. 장면 묘사를 조금 순화해서 다시 시도해 주세요.", status: 422 },
  noimage: { message: "AI가 그림을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.", status: 502 },
  model: { message: "선택한 모델을 이 키로 사용할 수 없습니다. 다른 그림 모델을 선택하거나 Google AI Studio의 결제 설정을 확인해 주세요.", status: 400 },
  badjson: { message: "AI가 올바른 형식의 대본을 만들지 못했습니다. 다시 시도해 주세요.", status: 502 },
  unknown: { message: "AI 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.", status: 500 },
};

/** 어떤 예외든 사용자에게 보여줄 한국어 메시지와 HTTP 상태로 바꾼다(키·이미지 값은 절대 포함하지 않는다) */
export function toUserError(e: unknown): { code: AiErrorCode; message: string; status: number } {
  // 메시지를 넣어 던진 AiError(공용 이미지 모듈의 시간 초과 표준 안내 등)는 그 메시지를 보여 준다
  if (e instanceof AiError) return { code: e.code, ...TABLE[e.code], ...(e.message ? { message: e.message } : {}) };
  const raw = (e instanceof Error ? e.message : String(e ?? "")).toLowerCase();
  if (/not found|\b404\b|is not supported|unsupported model|does not exist/.test(raw)) return { code: "model", ...TABLE.model };
  if (/api key|api_key|permission|unauthenticated|\b401\b|\b403\b/.test(raw)) return { code: "key", ...TABLE.key };
  if (/quota|resource_exhausted|\b429\b|rate/.test(raw)) return { code: "quota", ...TABLE.quota };
  if (/timeout|deadline|\b503\b|\b504\b|unavailable|abort|overloaded/.test(raw)) return { code: "timeout", ...TABLE.timeout };
  return { code: "unknown", ...TABLE.unknown };
}

function isTransient(e: unknown): boolean {
  const raw = (e instanceof Error ? e.message : String(e ?? "")).toLowerCase();
  return /\b429\b|resource_exhausted|\b500\b|\b502\b|\b503\b|\b504\b|unavailable|overloaded|fetch failed|network/.test(raw);
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 일시적 오류(429·5xx·네트워크)는 지수 백오프로 최대 2회 다시 시도한다 */
async function withRetry<T>(fn: () => Promise<T>, tries = 2): Promise<T> {
  for (let i = 0; ; i++) {
    try { return await fn(); } catch (e) {
      if (i >= tries || !isTransient(e)) throw e;
      await wait(1000 * 2 ** i + Math.random() * 400);
    }
  }
}

/** 텍스트 생성. json=true면 JSON MIME 응답, search=true면 Google 검색 근거 사용(둘은 병용 불가) */
export async function generateText(o: { apiKey: string; prompt: string; json?: boolean; search?: boolean; schema?: unknown }): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: o.apiKey });
  const config: Record<string, unknown> = {};
  if (o.search) config.tools = [{ googleSearch: {} }];
  else if (o.json) {
    config.responseMimeType = "application/json";
    if (o.schema) config.responseSchema = o.schema;
  }
  const res = await withRetry(() => ai.models.generateContent({ model: TEXT_MODEL, contents: o.prompt, config: config as never }));
  const text = (res.text ?? "").trim();
  if (!text) throw new AiError("noimage");
  return text;
}

/** 이미지 1장을 보고 JSON 텍스트로 답하게 한다(말풍선 위치 판단). 텍스트 모델 사용 */
export async function generateVisionJson(o: { apiKey: string; prompt: string; image: { data: string; mimeType: string } }): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: o.apiKey });
  const res = await withRetry(() => ai.models.generateContent({
    model: TEXT_MODEL,
    contents: { parts: [{ inlineData: { data: o.image.data, mimeType: o.image.mimeType } }, { text: o.prompt }] },
    config: { responseMimeType: "application/json" },
  }));
  const text = (res.text ?? "").trim();
  if (!text) throw new AiError("badjson");
  return text;
}

export interface GeneratedImage { data: string; mimeType: string }

/** 공용 이미지 모듈 오류 → 이 프로그램의 AiError(코드·문구 표는 그대로, 시간 초과·연결 오류는 공용 안내 문구 사용) */
function fromImageError(e: GeminiImageError): AiError {
  switch (e.code) {
    case "INVALID_KEY": case "PERMISSION_DENIED": case "API_NOT_ENABLED": return new AiError("key");
    case "QUOTA_EXCEEDED": case "RATE_LIMITED": return new AiError("quota");
    case "MODEL_NOT_FOUND": return new AiError("model");
    case "SAFETY_BLOCKED": return new AiError("safety");
    case "NO_IMAGE": return new AiError("noimage");
    case "TIMEOUT": case "NETWORK": case "SERVER_ERROR": return new AiError("timeout", e.message);
    default: return new AiError("unknown");
  }
}

/**
 * 이미지 1장 생성(기본 정사각형, 컷은 회원이 고른 비율). 참고 이미지(inlineData) 다음에 지시문(text)을 넣는다.
 * 2026-10-18: 호출·대기·이미지 받기는 공용 기준 코드 gemini-image-client(./geminiImage — 기준은 ai-image-studio).
 * 라우트 함수 한도 300초(2026-10-18 60초에서 상향)라 시간 제한 240초, 유료 생성이라 재시도 없음(이중 과금 방지). 모델·비율·프롬프트는 그대로.
 */
export async function generateImage(o: {
  apiKey: string; model: string; prompt: string; refs?: { data: string; mimeType: string }[]; aspectRatio?: string;
}): Promise<GeneratedImage> {
  try {
    const image = await generateGeminiImage({
      apiKey: o.apiKey,
      modelName: o.model,
      parts: [...(o.refs ?? []).map((r) => ({ inlineData: { data: r.data, mimeType: r.mimeType } })), { text: o.prompt }],
      aspectRatio: o.aspectRatio ?? "1:1",
      timeoutMs: 240_000,
      retries: 0,
    });
    return { data: image.base64, mimeType: image.mimeType || "image/png" };
  } catch (e) {
    if (e instanceof GeminiImageError) throw fromImageError(e);
    throw e;
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
