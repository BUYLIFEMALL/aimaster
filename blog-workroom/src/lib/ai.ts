import "server-only";
import { parseJsonLoose } from "@/lib/util";
import type { AiProvider } from "@/lib/models";
import { GeminiImageError, generateGeminiImage } from "./geminiImage";

// AI 호출은 전부 회원 본인 키로, 서버에서만 한다. 공급사 응답 원문은 회원 입력·키가 섞일 수 있어 화면에 그대로 보내지 않는다.
export class AiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

export interface AiConfig { provider: AiProvider; model: string; apiKey: string }

const LABEL: Record<AiProvider, string> = { openai: "OpenAI", gemini: "Gemini" };

function providerError(provider: AiProvider, status: number): AiError {
  const who = LABEL[provider];
  if (status === 429) return new AiError(429, "quota", `본인 ${who} 계정의 사용 한도·결제 설정을 확인해 주세요. 잠시 후 저장 지점부터 다시 진행할 수 있습니다.`);
  if (status === 401 || status === 403) return new AiError(400, "key", `본인 ${who} API 키와 모델 사용 권한을 확인해 주세요.`);
  if (status === 404) return new AiError(422, "model", `선택한 ${who} 모델을 쓸 수 없습니다. 설정에서 다른 모델을 골라 주세요.`);
  if (status === 400) return new AiError(400, "request", `${who}가 요청을 처리하지 못했습니다. 입력 길이나 모델을 확인해 주세요.`);
  return new AiError(502, "provider", `${who} 서버에서 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.`);
}

async function post(url: string, headers: Record<string, string>, body: unknown, provider: AiProvider, timeoutMs: number) {
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs), cache: "no-store" });
  } catch {
    throw new AiError(504, "timeout", "AI 응답이 늦거나 연결이 끊겼습니다. 저장된 단계부터 다시 진행해 주세요.");
  }
  if (!res.ok) throw providerError(provider, res.status);
  try { return await res.json(); } catch { throw new AiError(502, "response", "AI 응답 형식이 올바르지 않습니다."); }
}

/** 텍스트 응답(JSON 지시 포함)을 받아 원문 문자열로 돌려준다 */
export async function generateText(cfg: AiConfig, o: { system: string; prompt: string; json?: boolean; maxTokens?: number; timeoutMs?: number }): Promise<string> {
  const timeout = o.timeoutMs ?? 240_000;
  if (cfg.provider === "openai") {
    const data = await post("https://api.openai.com/v1/chat/completions", { Authorization: `Bearer ${cfg.apiKey}` }, {
      model: cfg.model,
      messages: [{ role: "system", content: o.system }, { role: "user", content: o.prompt }],
      ...(o.json ? { response_format: { type: "json_object" } } : {}),
      max_completion_tokens: o.maxTokens ?? 8000,
    }, "openai", timeout);
    const choice = data?.choices?.[0];
    const text = typeof choice?.message?.content === "string" ? choice.message.content : "";
    if (!text) throw new AiError(502, "empty", choice?.finish_reason === "length" ? "AI 응답이 길이 제한으로 끊겼습니다. 다시 시도해 주세요." : "AI가 빈 응답을 보냈습니다. 다시 시도해 주세요.");
    return text;
  }
  const data = await post(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cfg.model)}:generateContent`, { "x-goog-api-key": cfg.apiKey }, {
    systemInstruction: { parts: [{ text: o.system }] },
    contents: [{ role: "user", parts: [{ text: o.prompt }] }],
    generationConfig: { maxOutputTokens: Math.max(16000, o.maxTokens ?? 16000), ...(o.json ? { responseMimeType: "application/json" } : {}) },
  }, "gemini", timeout);
  const cand = data?.candidates?.[0];
  if (data?.promptFeedback?.blockReason || cand?.finishReason === "SAFETY" || cand?.finishReason === "PROHIBITED_CONTENT") throw new AiError(422, "safety", "AI가 이 내용을 처리하지 않았습니다. 입력을 확인해 주세요.");
  const text = (cand?.content?.parts ?? []).filter((p: { text?: string; thought?: boolean }) => p.text && !p.thought).map((p: { text: string }) => p.text).join("");
  if (!text) throw new AiError(502, "empty", cand?.finishReason === "MAX_TOKENS" ? "AI 응답이 길이 제한으로 끊겼습니다. 다시 시도해 주세요." : "AI가 빈 응답을 보냈습니다. 다시 시도해 주세요.");
  return text;
}

/** JSON 객체 응답. 형식이 깨지면 한 번만 다시 요청한다 */
export async function generateJson(cfg: AiConfig, o: { system: string; prompt: string; maxTokens?: number; timeoutMs?: number }): Promise<Record<string, unknown>> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const text = await generateText(cfg, { ...o, json: true });
    const parsed = parseJsonLoose(text);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
  }
  throw new AiError(502, "json", "AI 응답을 해석하지 못했습니다. 다시 시도해 주세요.");
}

export async function testKey(provider: AiProvider, apiKey: string, model: string): Promise<void> {
  await generateText({ provider, apiKey, model }, { system: "짧게 답하세요.", prompt: "연결 확인이라고만 답하세요.", maxTokens: 2000, timeoutMs: 60_000 });
}

/** Gemini 이미지 생성(회원 본인 키). 참고 이미지는 inlineData로 함께 보낸다 */
export async function generateImage(apiKey: string, model: string, prompt: string, refs: { data: string; mimeType: string }[], aspect: string): Promise<{ bytes: Buffer; mimeType: string }> {
  // 2026-10-17: 호출·대기·최종 이미지 받아오기(중간 초안 thought 조각 제외)·안전 차단 판별은 공용 기준 코드 gemini-image-client(./geminiImage — 기준은 ai-image-studio).
  // 원래처럼 재시도하지 않고(retries: 0, 저장된 단계부터 다시 진행하는 구조) 200초 제한·프롬프트·비율·오류 문구는 그대로.
  let image: { base64: string; mimeType: string };
  try {
    image = await generateGeminiImage({
      apiKey,
      modelName: model,
      parts: [...refs.map((r) => ({ inlineData: { data: r.data, mimeType: r.mimeType } })), { text: prompt }],
      aspectRatio: aspect,
      responseModalities: ["TEXT", "IMAGE"],
      timeoutMs: 200_000,
      retries: 0,
    });
  } catch (e) {
    if (!(e instanceof GeminiImageError)) throw e;
    if (e.code === "TIMEOUT" || e.code === "NETWORK") throw new AiError(504, "timeout", "이미지 생성 응답을 받지 못했습니다. 이미지가 이미 만들어졌을 수 있으니 잠시 뒤 결과를 확인한 다음 저장된 단계부터 다시 진행해 주세요.");
    if (e.code === "SAFETY_BLOCKED") throw new AiError(422, "safety", "AI가 이 이미지 요청을 처리하지 않았습니다. 요청이나 참고 이미지를 바꿔 주세요.");
    if (e.code === "NO_IMAGE") throw new AiError(502, "noimage", "AI가 이미지를 돌려주지 않았습니다. 다시 시도해 주세요.");
    throw providerError("gemini", e.status);
  }
  if (!/^image\/(png|jpeg|webp)$/.test(image.mimeType)) throw new AiError(502, "noimage", "AI가 이미지를 돌려주지 않았습니다. 다시 시도해 주세요.");
  return { bytes: Buffer.from(image.base64, "base64"), mimeType: image.mimeType };
}
