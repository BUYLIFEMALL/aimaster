import "server-only";
import { GoogleGenAI } from "@google/genai";
import type { AspectRatio, ModelLevel, Resolution } from "@/lib/portrait/options";

// 모델명은 자주 바뀌므로 한곳에서 관리한다. pro를 쓸 수 없으면 flash로 한 번 더 시도한다.
export const IMAGE_MODELS: Record<ModelLevel, string> = {
  flash: "gemini-2.5-flash-image",
  pro: "gemini-3-pro-image-preview",
};
export const TEXT_MODEL = "gemini-2.5-flash";

export type AiErrorCode = "key" | "quota" | "timeout" | "safety" | "noimage" | "unknown";
export class AiError extends Error {
  constructor(public code: AiErrorCode, message = "") { super(message); }
}

const SAFETY_REASONS = new Set(["SAFETY", "IMAGE_SAFETY", "IMAGE_OTHER", "PROHIBITED_CONTENT", "BLOCKLIST", "SPII", "RECITATION"]);

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

async function callImage(apiKey: string, model: string, base64: string, mimeType: string, prompt: string, aspect: AspectRatio, resolution: Resolution, pro: boolean) {
  const ai = new GoogleGenAI({ apiKey });
  const res = await ai.models.generateContent({
    model,
    contents: { parts: [{ inlineData: { data: base64, mimeType } }, { text: prompt }] },
    config: { imageConfig: { aspectRatio: aspect, ...(pro ? { imageSize: resolution } : {}) } },
  });
  const cand = res.candidates?.[0];
  const img = cand?.content?.parts?.find((p) => p.inlineData?.data);
  if (img?.inlineData?.data) return { data: img.inlineData.data, mimeType: img.inlineData.mimeType || "image/png" };
  const reason = String(cand?.finishReason ?? "");
  const blocked = String(res.promptFeedback?.blockReason ?? "");
  if (SAFETY_REASONS.has(reason) || blocked) throw new AiError("safety");
  throw new AiError("noimage");
}

export interface PortraitImage { data: string; mimeType: string }

/** 인물 사진 1장 생성. pro 모델이 없으면 flash로 폴백한다(imageSize는 pro에서만 쓴다). */
export async function generatePortrait(o: {
  apiKey: string; base64: string; mimeType: string; prompt: string; aspect: AspectRatio; resolution: Resolution; level: ModelLevel;
}): Promise<PortraitImage & { model: string }> {
  const run = async (level: ModelLevel) => {
    const model = IMAGE_MODELS[level];
    const out = await callImage(o.apiKey, model, o.base64, o.mimeType, o.prompt, o.aspect, o.resolution, level === "pro");
    return { ...out, model };
  };
  try {
    return await run(o.level);
  } catch (e) {
    if (o.level === "pro" && isModelUnavailable(e)) return run("flash");
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

export interface HeadMeasure { found: boolean; crownY: number; chinY: number }

/** 정수리(머리카락 제외 최상부)와 턱 끝의 세로 위치를 이미지 높이 대비 0~1로 추정한다. */
export async function detectHead(apiKey: string, base64: string, mimeType: string): Promise<HeadMeasure> {
  const ai = new GoogleGenAI({ apiKey });
  const res = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: {
      parts: [
        { inlineData: { data: base64, mimeType } },
        { text: "This is an ID-style portrait photo. Estimate the vertical position of two landmarks as fractions of the full image height (0 = top edge, 1 = bottom edge): crownY = the top of the skull/head (the highest point of the head, ignoring any hair volume or hair tufts above the skull when possible), chinY = the bottom of the chin. If there is no single clearly visible face, set found=false and both values 0. Respond only with JSON." },
      ],
    },
    config: {
      temperature: 0,
      maxOutputTokens: 1024,
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: { found: { type: "BOOLEAN" }, crownY: { type: "NUMBER" }, chinY: { type: "NUMBER" } },
        required: ["found", "crownY", "chinY"],
      } as never,
    },
  });
  let parsed: { found?: unknown; crownY?: unknown; chinY?: unknown } = {};
  try { parsed = JSON.parse((res.text ?? "").trim()); } catch { /* 아래에서 처리 */ }
  const crown = Number(parsed.crownY);
  const chin = Number(parsed.chinY);
  const ok = parsed.found === true && Number.isFinite(crown) && Number.isFinite(chin) && crown >= 0 && chin <= 1 && chin > crown + 0.05;
  if (!ok) return { found: false, crownY: 0, chinY: 0 };
  return { found: true, crownY: crown, chinY: chin };
}
