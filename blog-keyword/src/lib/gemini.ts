import "server-only";
import { GoogleGenAI } from "@google/genai";
import { NaverError } from "@/lib/kw/naver";
import { parseJsonLoose, stripCitations } from "@/lib/kw/util";

// 모델명은 자주 바뀌므로 한곳에서 관리한다. 앞 모델을 쓸 수 없으면 다음 모델로 자동 폴백한다.
export const TEXT_MODELS = ["gemini-3.5-flash", "gemini-2.5-flash"];

export type AiErrorCode = "key" | "quota" | "timeout" | "parse" | "safety" | "naver" | "unknown";
export class AiError extends Error {
  constructor(public code: AiErrorCode, message = "") { super(message); }
}

/** 어떤 예외든 사용자에게 보여줄 한국어 메시지와 HTTP 상태로 바꾼다(키 값은 절대 포함하지 않는다) */
export function toUserError(e: unknown): { code: AiErrorCode; message: string; status: number; needNaver?: boolean } {
  if (e instanceof NaverError) {
    return { code: "naver", message: e.message, status: e.status, needNaver: e.code === "auth" };
  }
  const table: Record<Exclude<AiErrorCode, "naver">, { message: string; status: number }> = {
    key: { message: "등록한 Gemini API 키가 올바르지 않거나 권한이 없습니다. [API키등록·플랫폼연동]에서 키를 확인해 주세요.", status: 400 },
    quota: { message: "Gemini 사용 한도를 초과했습니다. 잠시 후 다시 시도하거나 본인 Google 계정의 한도를 확인해 주세요.", status: 429 },
    timeout: { message: "AI 응답이 늦어 중단되었습니다. 잠시 후 다시 시도해 주세요.", status: 504 },
    parse: { message: "AI가 올바른 형식으로 응답하지 못했습니다. 같은 버튼을 한 번 더 눌러 주세요.", status: 502 },
    safety: { message: "AI 안전 정책으로 분석하지 못했습니다. 키워드 표현을 바꿔 다시 시도해 주세요.", status: 422 },
    unknown: { message: "AI 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.", status: 500 },
  };
  if (e instanceof AiError && e.code !== "naver") return { code: e.code, ...table[e.code] };
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

export interface GenOptions {
  apiKey: string;
  system: string;
  user: string;
  /** 구글 검색 그라운딩(실시간 정보). 켜면 JSON 모드를 쓸 수 없어 텍스트에서 JSON을 꺼낸다. */
  grounded?: boolean;
  /** 그라운딩이 없을 때만 사용: 응답 JSON 스키마 */
  schema?: Record<string, unknown>;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface GenOut { text: string; sources: { title: string; uri: string }[]; model: string }

/** 텍스트 1회 생성. 모델 폴백 + 일시 오류 1회 재시도. */
export async function generateText(o: GenOptions): Promise<GenOut> {
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
            temperature: o.temperature ?? 0.4,
            maxOutputTokens: o.maxOutputTokens ?? 8192,
            ...(o.grounded ? { tools: [{ googleSearch: {} }] } : { responseMimeType: "application/json", responseSchema: o.schema as never }),
          },
        });
        if (res.promptFeedback?.blockReason) throw new AiError("safety");
        const text = res.text ?? "";
        if (!text.trim()) { last = new AiError("parse"); continue; }
        const chunks = res.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
        const seen = new Set<string>();
        const sources: { title: string; uri: string }[] = [];
        for (const c of chunks) {
          const uri = c.web?.uri;
          if (uri && !seen.has(uri) && sources.length < 8) { seen.add(uri); sources.push({ title: c.web?.title ?? uri, uri }); }
        }
        return { text, sources, model };
      } catch (e) {
        last = e;
        if (e instanceof AiError && e.code === "safety") throw e;
        if (isModelUnavailable(e)) break; // 다음 모델로
        const t = toUserError(e);
        if (t.code === "key" || t.code === "quota") throw e;
        // timeout·unknown은 한 번 더 시도
      }
    }
  }
  throw last ?? new AiError("unknown");
}

/** JSON 객체를 돌려주는 호출. 형식이 어긋나면 한 번 더 시도한다(그라운딩 응답은 텍스트에서 JSON을 꺼낸다). */
export async function generateJson(o: GenOptions): Promise<{ data: Record<string, unknown>; sources: { title: string; uri: string }[]; model: string }> {
  let last: unknown;
  for (let i = 0; i < 2; i++) {
    const out = await generateText({ ...o, temperature: i === 0 ? o.temperature : Math.min(0.9, (o.temperature ?? 0.4) + 0.2) });
    const parsed = parseJsonLoose(out.text);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return { data: parsed as Record<string, unknown>, sources: out.sources, model: out.model };
    }
    last = new AiError("parse");
  }
  throw last;
}

/** 마크다운 본문용(JSON이 아닌 자유 서식) 호출 */
export async function generateMarkdown(o: Omit<GenOptions, "schema">): Promise<{ markdown: string; sources: { title: string; uri: string }[]; model: string }> {
  const ai = new GoogleGenAI({ apiKey: o.apiKey });
  let last: unknown;
  for (const model of TEXT_MODELS) {
    try {
      const res = await ai.models.generateContent({
        model,
        contents: o.user,
        config: { systemInstruction: o.system, temperature: o.temperature ?? 0.5, maxOutputTokens: o.maxOutputTokens ?? 8192, ...(o.grounded ? { tools: [{ googleSearch: {} }] } : {}) },
      });
      if (res.promptFeedback?.blockReason) throw new AiError("safety");
      const text = stripCitations(res.text ?? "").trim();
      if (!text) { last = new AiError("parse"); continue; }
      const chunks = res.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
      const seen = new Set<string>();
      const sources: { title: string; uri: string }[] = [];
      for (const c of chunks) {
        const uri = c.web?.uri;
        if (uri && !seen.has(uri) && sources.length < 8) { seen.add(uri); sources.push({ title: c.web?.title ?? uri, uri }); }
      }
      return { markdown: text, sources, model };
    } catch (e) {
      last = e;
      if (e instanceof AiError && e.code === "safety") throw e;
      if (isModelUnavailable(e)) continue;
      throw e;
    }
  }
  throw last ?? new AiError("unknown");
}
