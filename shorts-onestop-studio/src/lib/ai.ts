import "server-only";
import { PROVIDER_LABEL, type AiProvider } from "@/lib/models";

// AI 호출은 전부 회원 본인 키로, 서버에서만 한다. 공급사 응답 원문은 화면에 그대로 보내지 않는다.
// 구조는 blog-workroom/src/lib/ai.ts(Gemini·OpenAI)를 가져와 Anthropic Messages API를 더했다.
export class AiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export interface AiConfig { provider: AiProvider; model: string; apiKey: string }

function providerError(provider: AiProvider, status: number): AiError {
  const who = PROVIDER_LABEL[provider];
  if (status === 429) return new AiError(429, "quota", `본인 ${who} 계정의 사용 한도·결제 설정을 확인해 주세요. 잠시 후 다시 시도할 수 있습니다.`);
  if (status === 401 || status === 403) return new AiError(400, "key", `본인 ${who} API 키와 모델 사용 권한을 확인해 주세요.`);
  if (status === 404) return new AiError(422, "model", `선택한 ${who} 모델을 쓸 수 없습니다. API키등록·플랫폼연동에서 다른 모델을 골라 주세요.`);
  if (status === 400) return new AiError(400, "request", `${who}가 요청을 처리하지 못했습니다. 입력 길이나 모델을 확인해 주세요.`);
  if (status === 529 || status === 503) return new AiError(503, "busy", `${who} 서버가 바쁩니다. 잠시 후 다시 시도해 주세요.`);
  return new AiError(502, "provider", `${who} 서버에서 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.`);
}

async function post(url: string, headers: Record<string, string>, body: unknown, provider: AiProvider, timeoutMs: number) {
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs), cache: "no-store" });
  } catch {
    throw new AiError(504, "timeout", "AI 응답이 늦거나 연결이 끊겼습니다. 다시 시도해 주세요.");
  }
  if (!res.ok) throw providerError(provider, res.status);
  try { return await res.json(); } catch { throw new AiError(502, "response", "AI 응답 형식이 올바르지 않습니다."); }
}

const EMPTY = "AI가 빈 응답을 보냈습니다. 다시 시도해 주세요.";
const CUT = "AI 응답이 길이 제한으로 끊겼습니다. 카드 수를 줄이거나 다시 시도해 주세요.";

/** 텍스트 응답을 원문 문자열로 돌려준다(json=true면 JSON만 내도록 요청) */
export async function generateText(cfg: AiConfig, o: { system: string; prompt: string; json?: boolean; maxTokens?: number; timeoutMs?: number }): Promise<string> {
  const timeout = o.timeoutMs ?? 120_000;
  const maxTokens = o.maxTokens ?? 6000;
  if (cfg.provider === "openai") {
    const data = await post("https://api.openai.com/v1/chat/completions", { Authorization: `Bearer ${cfg.apiKey}` }, {
      model: cfg.model,
      messages: [{ role: "system", content: o.system }, { role: "user", content: o.prompt }],
      ...(o.json ? { response_format: { type: "json_object" } } : {}),
      max_completion_tokens: maxTokens,
    }, "openai", timeout);
    const choice = data?.choices?.[0];
    const text = typeof choice?.message?.content === "string" ? choice.message.content : "";
    if (!text) throw new AiError(502, "empty", choice?.finish_reason === "length" ? CUT : EMPTY);
    return text;
  }
  if (cfg.provider === "anthropic") {
    const data = await post("https://api.anthropic.com/v1/messages", { "x-api-key": cfg.apiKey, "anthropic-version": "2023-06-01" }, {
      model: cfg.model,
      max_tokens: maxTokens,
      system: o.json ? `${o.system}\n\n반드시 JSON 객체 하나만 출력하세요. 설명 문장이나 코드 블록 표시는 쓰지 마세요.` : o.system,
      messages: [{ role: "user", content: o.prompt }],
    }, "anthropic", timeout);
    if (data?.stop_reason === "refusal") throw new AiError(422, "safety", "AI가 이 내용을 처리하지 않았습니다. 주제를 바꿔 주세요.");
    const text = (data?.content ?? []).filter((b: { type?: string }) => b.type === "text").map((b: { text: string }) => b.text).join("");
    if (!text) throw new AiError(502, "empty", data?.stop_reason === "max_tokens" ? CUT : EMPTY);
    return text;
  }
  const data = await post(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cfg.model)}:generateContent`, { "x-goog-api-key": cfg.apiKey }, {
    systemInstruction: { parts: [{ text: o.system }] },
    contents: [{ role: "user", parts: [{ text: o.prompt }] }],
    generationConfig: { maxOutputTokens: Math.max(8000, maxTokens), ...(o.json ? { responseMimeType: "application/json" } : {}) },
  }, "gemini", timeout);
  const cand = data?.candidates?.[0];
  if (data?.promptFeedback?.blockReason || cand?.finishReason === "SAFETY" || cand?.finishReason === "PROHIBITED_CONTENT") throw new AiError(422, "safety", "AI가 이 내용을 처리하지 않았습니다. 주제를 바꿔 주세요.");
  const text = (cand?.content?.parts ?? []).filter((p: { text?: string; thought?: boolean }) => p.text && !p.thought).map((p: { text: string }) => p.text).join("");
  if (!text) throw new AiError(502, "empty", cand?.finishReason === "MAX_TOKENS" ? CUT : EMPTY);
  return text;
}

/** 느슨한 JSON 파싱: 코드 블록·앞뒤 설명을 걷어 내고 첫 객체를 읽는다 */
export function parseJsonLoose(text: string): unknown {
  const t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  try { return JSON.parse(t); } catch { /* 아래 */ }
  const s = t.indexOf("{"), e = t.lastIndexOf("}");
  if (s >= 0 && e > s) { try { return JSON.parse(t.slice(s, e + 1)); } catch { /* 실패 */ } }
  return null;
}

/** JSON 객체 응답. 형식이 깨지면 한 번만 다시 요청한다 */
export async function generateJson(cfg: AiConfig, o: { system: string; prompt: string; maxTokens?: number; timeoutMs?: number }): Promise<Record<string, unknown>> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const parsed = parseJsonLoose(await generateText(cfg, { ...o, json: true }));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
  }
  throw new AiError(502, "json", "AI 응답을 해석하지 못했습니다. 다시 시도해 주세요.");
}
