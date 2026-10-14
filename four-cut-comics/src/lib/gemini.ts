import "server-only";
import { GoogleGenAI } from "@google/genai";

// 모델명은 자주 바뀌므로 한곳에서 관리한다(이미지 모델 후보는 lib/comic/options.ts).
export const TEXT_MODEL = "gemini-flash-lite-latest";

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

const SAFETY_REASONS = new Set(["SAFETY", "IMAGE_SAFETY", "IMAGE_OTHER", "PROHIBITED_CONTENT", "BLOCKLIST", "SPII", "RECITATION"]);

/** 어떤 예외든 사용자에게 보여줄 한국어 메시지와 HTTP 상태로 바꾼다(키·이미지 값은 절대 포함하지 않는다) */
export function toUserError(e: unknown): { code: AiErrorCode; message: string; status: number } {
  if (e instanceof AiError) return { code: e.code, ...TABLE[e.code] };
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

/** 이미지 1장 생성(기본 정사각형, 컷은 회원이 고른 비율). parts에는 참고 이미지(inlineData)와 지시문(text)을 순서대로 넣는다 */
export async function generateImage(o: {
  apiKey: string; model: string; prompt: string; refs?: { data: string; mimeType: string }[]; aspectRatio?: string;
}): Promise<GeneratedImage> {
  const ai = new GoogleGenAI({ apiKey: o.apiKey });
  const parts = [
    ...(o.refs ?? []).map((r) => ({ inlineData: { data: r.data, mimeType: r.mimeType } })),
    { text: o.prompt },
  ];
  const res = await withRetry(() => ai.models.generateContent({
    model: o.model,
    contents: { parts },
    config: { imageConfig: { aspectRatio: o.aspectRatio ?? "1:1" } },
  }));
  const cand = res.candidates?.[0];
  const list = [...(cand?.content?.parts ?? [])].reverse();
  const img = list.find((p) => p.inlineData?.data && !p.thought);
  if (img?.inlineData?.data) return { data: img.inlineData.data, mimeType: img.inlineData.mimeType || "image/png" };
  const reason = String(cand?.finishReason ?? "");
  const blocked = String(res.promptFeedback?.blockReason ?? "");
  if (SAFETY_REASONS.has(reason) || blocked) throw new AiError("safety");
  throw new AiError("noimage");
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
