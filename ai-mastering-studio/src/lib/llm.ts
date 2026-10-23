import "server-only";
import { GoogleGenAI } from "@google/genai";
import { PROVIDER_LABELS, textModelById, type Provider } from "@/lib/mastering/models";
import { extractJson } from "@/lib/mastering/params";

export interface Prompt { system: string; user: string }
export interface Ok<T> { ok: true; data: T; ms: number }
export interface Fail { ok: false; error: string; status: number }

/** 키가 없을 때의 안내 응답(다른 키로 대신하지 않는다) */
export const needKeyBody = (provider: Provider) => ({
  error: `등록된 ${PROVIDER_LABELS[provider]} API 키가 없습니다. 좌측 메뉴의 API키등록·플랫폼연동에서 본인 키를 먼저 등록해 주세요.`,
  needKey: true,
  provider,
});

/** 공급사 오류를 한국어 문구로 바꾼다 */
export function explainError(e: unknown, provider: Provider): Fail {
  const msg = e instanceof Error ? e.message : String(e);
  const name = PROVIDER_LABELS[provider];
  if (/SAFETY|blocked|prohibited|content_policy|moderation/i.test(msg)) return { ok: false, status: 422, error: "AI가 안전 정책으로 이 요청의 처리를 거부했습니다. 설명을 조금 바꿔 다시 시도해 주세요." };
  if (/quota|429|rate.?limit|RESOURCE_EXHAUSTED|insufficient_quota|overloaded/i.test(msg)) return { ok: false, status: 429, error: `${name} 사용 한도를 넘었거나 요청이 몰렸습니다. 잠시 후 다시 시도하거나 본인 키의 한도·결제 상태를 확인해 주세요.` };
  if (/PERMISSION_DENIED|403|not allowed|access/i.test(msg)) return { ok: false, status: 400, error: `${name} 권한이 거부되었습니다. 키 제한 설정과 해당 모델 사용 권한을 확인해 주세요.` };
  if (/API key|API_KEY|invalid|401|authentication|unauthorized/i.test(msg)) return { ok: false, status: 400, error: `${name} API 키가 올바르지 않습니다. API키등록·플랫폼연동 메뉴에서 키를 확인해 주세요.` };
  if (/not.?found|404|does not exist|model/i.test(msg)) return { ok: false, status: 400, error: `선택한 모델을 ${name}에서 찾을 수 없습니다. 다른 모델을 선택해 주세요.` };
  return { ok: false, status: 502, error: "AI 처리에 실패했습니다. 잠시 후 다시 시도해 주세요." };
}

async function callGemini(apiKey: string, model: string, p: Prompt) {
  const ai = new GoogleGenAI({ apiKey });
  const res = await ai.models.generateContent({
    model,
    contents: { parts: [{ text: p.user }] },
    config: { systemInstruction: p.system, responseMimeType: "application/json", thinkingConfig: { thinkingBudget: 0 } },
  });
  return (res.text ?? "").trim();
}

async function callOpenAI(apiKey: string, model: string, p: Prompt) {
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: [{ role: "system", content: p.system }, { role: "user", content: p.user }], response_format: { type: "json_object" } }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${r.status} ${d?.error?.code ?? ""} ${d?.error?.message ?? ""}`);
  return String(d.choices?.[0]?.message?.content ?? "").trim();
}

async function callClaude(apiKey: string, model: string, p: Prompt) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model, max_tokens: 2000, system: p.system, messages: [{ role: "user", content: p.user }] }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${r.status} ${d?.error?.type ?? ""} ${d?.error?.message ?? ""}`);
  return (Array.isArray(d.content) ? d.content.map((c: { text?: string }) => c.text ?? "").join("") : "").trim();
}

/** 선택한 텍스트 모델로 JSON 결과를 받는다 */
export async function generateJson(modelId: string, apiKey: string, p: Prompt): Promise<Ok<unknown> | Fail> {
  const model = textModelById(modelId);
  if (!model) return { ok: false, status: 400, error: "지원하지 않는 모델입니다." };
  const started = Date.now();
  try {
    const text =
      model.provider === "gemini" ? await callGemini(apiKey, model.id, p)
      : model.provider === "openai" ? await callOpenAI(apiKey, model.id, p)
      : await callClaude(apiKey, model.id, p);
    if (!text) return { ok: false, status: 502, error: "AI가 빈 결과를 돌려주었습니다. 다시 시도해 주세요." };
    const data = extractJson(text);
    if (data === null) return { ok: false, status: 502, error: "AI 응답을 해석하지 못했습니다. 다시 시도해 주세요." };
    return { ok: true, data, ms: Date.now() - started };
  } catch (e) {
    return explainError(e, model.provider);
  }
}
