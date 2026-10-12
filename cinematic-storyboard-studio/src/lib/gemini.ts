import "server-only";
import { GoogleGenAI } from "@google/genai";
import { ENGINES, TEXT_MODEL, type EngineId } from "@/lib/storyboard/types";

export interface Ok<T> { ok: true; data: T; ms: number }
export interface Fail { ok: false; error: string; status: number }

export const NEED_KEY_RESPONSE = {
  error: "등록된 Gemini API 키가 없습니다. 좌측 메뉴의 API키등록·플랫폼연동에서 본인 API 키를 먼저 등록해 주세요.",
  needKey: true,
};

/** Gemini 오류를 사용자에게 보여줄 한국어 문구로 바꾼다 */
export function explainError(e: unknown, engine?: EngineId): Fail {
  const msg = e instanceof Error ? e.message : String(e);
  if (/PERMISSION_DENIED|403/i.test(msg)) {
    return {
      ok: false,
      status: 400,
      error:
        engine === "pro"
          ? "Pro 이미지 모델 권한이 없습니다. Pro는 본인 Google 계정에 결제 계정(Billing) 연결이 필요합니다. 결제를 연결하거나 표준(Nano Banana) 엔진을 선택해 주세요."
          : "Gemini API 권한이 거부되었습니다. Google Cloud에서 Generative Language API 사용 설정과 키 제한을 확인해 주세요.",
    };
  }
  if (/API key|API_KEY|invalid|401/i.test(msg)) return { ok: false, status: 400, error: "Gemini API 키가 올바르지 않습니다. API키등록·플랫폼연동 메뉴에서 키를 확인해 주세요." };
  if (/quota|429|rate|RESOURCE_EXHAUSTED/i.test(msg)) return { ok: false, status: 429, error: "Gemini 사용 한도를 넘었습니다. 잠시 후 다시 시도하거나 본인 키의 한도를 확인해 주세요." };
  if (/SAFETY|blocked|prohibited/i.test(msg)) return { ok: false, status: 422, error: "AI가 안전 정책으로 이 이미지의 처리를 거부했습니다. 다른 이미지로 시도해 주세요." };
  return { ok: false, status: 502, error: "AI 처리에 실패했습니다. 잠시 후 다시 시도해 주세요." };
}

export type Part = { text: string } | { inlineData: { mimeType: string; data: string } };
export const imagePart = (buf: Buffer, mimeType = "image/jpeg"): Part => ({ inlineData: { mimeType, data: buf.toString("base64") } });

/** JSON 구조를 강제해 받는다(분석·영상 프롬프트) */
export async function generateJson(apiKey: string, parts: Part[], schema: unknown): Promise<Ok<unknown> | Fail> {
  const started = Date.now();
  try {
    const ai = new GoogleGenAI({ apiKey });
    const res = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: { parts },
      config: { responseMimeType: "application/json", responseSchema: schema as never, thinkingConfig: { thinkingBudget: 0 } },
    });
    const text = (res.text ?? "").trim();
    if (!text) return { ok: false, status: 502, error: "AI가 빈 결과를 돌려주었습니다. 다시 시도해 주세요." };
    return { ok: true, data: JSON.parse(text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "")), ms: Date.now() - started };
  } catch (e) {
    if (e instanceof SyntaxError) return { ok: false, status: 502, error: "AI 응답을 해석하지 못했습니다. 다시 시도해 주세요." };
    return explainError(e);
  }
}

export async function generateText(apiKey: string, parts: Part[]): Promise<Ok<string> | Fail> {
  const started = Date.now();
  try {
    const ai = new GoogleGenAI({ apiKey });
    const res = await ai.models.generateContent({ model: TEXT_MODEL, contents: { parts }, config: { thinkingConfig: { thinkingBudget: 0 } } });
    const text = (res.text ?? "").trim();
    if (!text) return { ok: false, status: 502, error: "AI가 빈 결과를 돌려주었습니다." };
    return { ok: true, data: text, ms: Date.now() - started };
  } catch (e) {
    return explainError(e);
  }
}

/** 마스터 콘택트 시트 이미지를 만든다(3:2). Pro는 2K. */
export async function generateImage(apiKey: string, engine: EngineId, parts: Part[]): Promise<Ok<{ buffer: Buffer; mime: string }> | Fail> {
  const started = Date.now();
  const cfg = ENGINES[engine];
  try {
    const ai = new GoogleGenAI({ apiKey });
    const res = await ai.models.generateContent({
      model: cfg.model,
      contents: { parts },
      config: { imageConfig: { aspectRatio: "3:2", ...(cfg.imageSize ? { imageSize: cfg.imageSize } : {}) } as never },
    });
    for (const p of res.candidates?.[0]?.content?.parts ?? []) {
      if (p.inlineData?.data) return { ok: true, data: { buffer: Buffer.from(p.inlineData.data, "base64"), mime: p.inlineData.mimeType ?? "image/png" }, ms: Date.now() - started };
    }
    return { ok: false, status: 502, error: "이미지가 생성되지 않았습니다. 다른 이미지나 주제로 다시 시도해 주세요." };
  } catch (e) {
    return explainError(e, engine);
  }
}
