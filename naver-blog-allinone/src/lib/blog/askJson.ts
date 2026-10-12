// 주제 추천·키워드 분석 같은 "프롬프트 하나 → JSON 하나" 호출을 설정에서 고른 글 AI(Gemini/GPT/Claude)와 본인 키로 보낸다.
// 예전에는 이 호출들이 항상 Gemini 키·Gemini 모델을 직접 불러서 GPT/Claude를 고른 회원도 Gemini 키가 없으면 쓸 수 없었다.
import type { AppSettings } from "@/lib/storage";
import { callLlm } from "./llm";
import { resolveTextEngine } from "./models";

export type JsonShape = "array" | "object";

/** 모델 응답에서 JSON(배열 또는 객체) 구간만 꺼내 파싱한다. 코드 펜스·앞뒤 설명이 있어도 처리한다. 실패하면 null. */
export function extractJson(text: string, shape: JsonShape): unknown {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  const open = shape === "array" ? "[" : "{";
  const close = shape === "array" ? "]" : "}";
  const start = cleaned.indexOf(open);
  const end = cleaned.lastIndexOf(close);
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

/**
 * 프롬프트를 선택한 글 AI로 보내고 JSON을 돌려준다(키가 없으면 호출하는 쪽이 missingKeyMessage로 먼저 막는다).
 * OpenAI의 JSON 모드는 최상위가 객체여야 해서, 배열 응답이 필요한 호출은 Gemini만 JSON 모드를 쓰고 나머지는 프롬프트 지시와 파싱으로 처리한다.
 */
export async function askLlmJson<T>(settings: AppSettings, prompt: string, shape: JsonShape, temperature = 0.7): Promise<T> {
  const eng = resolveTextEngine(settings);
  const text = await callLlm({
    provider: eng.provider,
    model: eng.model,
    apiKey: eng.apiKey,
    system: `너는 요청받은 형식 그대로 ${shape === "array" ? "JSON 배열" : "JSON 객체"} 하나만 응답한다. 마크다운·설명·코드 펜스를 붙이지 않는다.`,
    user: prompt,
    json: shape === "object" || eng.provider === "gemini",
    temperature,
    maxTokens: 8192,
  });
  const parsed = extractJson(text, shape);
  if (parsed === null) throw new Error("AI 응답을 읽지 못했습니다. 잠시 후 다시 시도해주세요.");
  return parsed as T;
}
