import "server-only";
import { GoogleGenAI } from "@google/genai";

// 모델명은 자주 바뀌므로 한곳에서 관리한다. 앞 모델을 쓸 수 없으면 다음 모델로 자동 폴백한다.
export const TEXT_MODELS = ["gemini-3.5-flash", "gemini-2.5-flash"];

export type AiErrorCode = "key" | "quota" | "timeout" | "parse" | "safety" | "empty" | "unknown";
export class AiError extends Error {
  constructor(public code: AiErrorCode, message = "") { super(message); }
}

/** 어떤 예외든 사용자에게 보여줄 한국어 메시지와 HTTP 상태로 바꾼다(키 값은 절대 포함하지 않는다) */
export function toUserError(e: unknown): { code: AiErrorCode; message: string; status: number } {
  const table: Record<AiErrorCode, { message: string; status: number }> = {
    key: { message: "등록한 Gemini API 키가 올바르지 않거나 권한이 없습니다. [API키등록·플랫폼연동]에서 키를 확인해 주세요.", status: 400 },
    quota: { message: "Gemini 사용 한도를 초과했습니다. 잠시 후 다시 시도하거나 본인 Google 계정의 한도를 확인해 주세요.", status: 429 },
    timeout: { message: "AI 응답이 늦어 중단되었습니다. 잠시 후 다시 시도해 주세요.", status: 504 },
    parse: { message: "AI가 올바른 형식으로 응답하지 못했습니다. 같은 버튼을 한 번 더 눌러 주세요.", status: 502 },
    safety: { message: "AI 안전 정책으로 처리하지 못했습니다. 내용을 바꿔 다시 시도해 주세요.", status: 422 },
    empty: { message: "AI가 빈 응답을 돌려주었습니다. 다시 시도해 주세요.", status: 502 },
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

function isFatal(e: unknown): boolean {
  const c = toUserError(e).code;
  return c === "key" || c === "quota" || c === "safety";
}

interface BaseOptions {
  apiKey: string;
  system: string;
  user: string;
  temperature?: number;
  maxOutputTokens?: number;
}

/** 모델이 코드펜스·앞뒤 문장을 붙여도 JSON 객체를 꺼낸다. 실패하면 null */
export function parseJsonLoose(text: unknown): unknown {
  if (typeof text !== "string") return null;
  const t = text.trim().replace(/^```(?:json)?s*/i, "").replace(/s*```$/, "");
  try { return JSON.parse(t); } catch { /* 아래에서 객체 구간만 다시 시도 */ }
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch { return null; } }
  return null;
}

/** 본문 텍스트 1건 생성. 모델 폴백 + 일시 오류 1회 재시도. */
export async function generatePlain(o: BaseOptions): Promise<{ text: string; model: string; truncated: boolean }> {
  const ai = new GoogleGenAI({ apiKey: o.apiKey });
  let last: unknown;
  for (const model of TEXT_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await ai.models.generateContent({
          model,
          contents: o.user,
          config: { systemInstruction: o.system, temperature: o.temperature ?? 0.7, maxOutputTokens: o.maxOutputTokens ?? 8192 },
        });
        if (res.promptFeedback?.blockReason) throw new AiError("safety");
        const text = (res.text ?? "").trim();
        if (!text) { last = new AiError("empty"); continue; }
        // 사고(thinking) 토큰도 출력 한도에 포함되므로 한도가 작으면 답이 중간에 끊긴다
        const truncated = String(res.candidates?.[0]?.finishReason ?? "") === "MAX_TOKENS";
        return { text, model, truncated };
      } catch (e) {
        last = e;
        if (isModelUnavailable(e)) break;
        if (isFatal(e) || e instanceof AiError) throw e;
      }
    }
  }
  throw last ?? new AiError("unknown");
}

/** JSON을 돌려주는 호출(스키마 사용, 그라운딩 없음). 형식이 어긋나면 모델당 한 번 더 시도한다. */
export async function generateJson(o: BaseOptions & { schema: Record<string, unknown> }): Promise<{ data: unknown; model: string }> {
  const ai = new GoogleGenAI({ apiKey: o.apiKey });
  let last: unknown;
  for (const model of TEXT_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await ai.models.generateContent({
          model,
          contents: o.user,
          config: {
            systemInstruction: o.system,
            temperature: o.temperature ?? 0.3,
            maxOutputTokens: o.maxOutputTokens ?? 8192,
            responseMimeType: "application/json",
            responseSchema: o.schema as never,
          },
        });
        if (res.promptFeedback?.blockReason) throw new AiError("safety");
        const parsed = parseJsonLoose(res.text);
        if (parsed !== null) return { data: parsed, model };
        last = new AiError("parse");
      } catch (e) {
        last = e;
        if (isModelUnavailable(e)) break;
        if (isFatal(e)) throw e;
      }
    }
  }
  throw last ?? new AiError("unknown");
}
