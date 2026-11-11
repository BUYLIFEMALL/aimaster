// 글 생성 서버 호출(OpenAI·Claude·Gemini). v1.15(2026-11-11).
// 호출 방식 기준: blog-neighbor-care/src/lib/analysis/provider.ts(세 플랫폼 요청·응답 모양), OpenAI 옵션은 공용 모듈 openai-request-params 사본.
// 회원 본인 키만 쓴다(운영자·다른 회원 키 폴백 없음). 유료 호출이라 자동 재시도는 하지 않는다(이중 과금 방지).
import { openAIGenerationParams, openAIErrorReason } from "./openaiRequestParams";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentTextModel, textModelProvider, missingTextKeyMessage, TEXT_PROVIDER_LABEL, type TextProvider } from "@/lib/textModels";

export class TextLlmError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

/** 회원 본인 키. Gemini는 화면이 보낸 키(브라우저 보관)를 먼저, 나머지는 공용 user_api_keys에서만 읽는다. */
export async function resolveTextKey(userId: string | null | undefined, provider: TextProvider, clientGeminiKey?: unknown): Promise<string> {
  if (provider === "gemini" && typeof clientGeminiKey === "string" && clientGeminiKey.trim()) return clientGeminiKey.trim();
  if (!userId) throw new TextLlmError(missingTextKeyMessage(provider), 400);
  const { data } = await createAdminClient()
    .from("user_api_keys")
    .select("api_key")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();
  const key = typeof data?.api_key === "string" ? data.api_key.trim() : "";
  if (!key) throw new TextLlmError(missingTextKeyMessage(provider), 400);
  return key;
}

/** 응답 글에서 JSON 객체만 꺼낸다(코드 울타리·앞뒤 설명 제거). */
export function parseJsonText(raw: string): unknown {
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new TextLlmError("AI 응답을 읽지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
  }
}

type GenerateOptions = { model: unknown; key: string; prompt: string; temperature?: number; maxTokens?: number; fetcher?: typeof fetch };

/** 고른 모델의 플랫폼으로 한 번 호출하고 JSON 결과를 돌려준다. */
export async function generateTextJson({ model: modelInput, key, prompt, temperature = 0.7, maxTokens = 8000, fetcher = fetch }: GenerateOptions): Promise<unknown> {
  const model = currentTextModel(modelInput);
  const provider = textModelProvider(model);
  const label = TEXT_PROVIDER_LABEL[provider];
  let url: string;
  let headers: Record<string, string>;
  let body: unknown;

  if (provider === "openai") {
    url = "https://api.openai.com/v1/chat/completions";
    headers = { Authorization: `Bearer ${key}` };
    body = { model, messages: [{ role: "user", content: prompt }], response_format: { type: "json_object" }, ...openAIGenerationParams(model, { temperature, maxTokens }) };
  } else if (provider === "anthropic") {
    url = "https://api.anthropic.com/v1/messages";
    headers = { "x-api-key": key, "anthropic-version": "2023-06-01" };
    body = { model, max_tokens: maxTokens, messages: [{ role: "user", content: prompt }] };
  } else {
    url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    headers = { "x-goog-api-key": key };
    body = { contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature, responseMimeType: "application/json" } };
  }

  let response: Response;
  try {
    response = await fetcher(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(240_000),
    });
  } catch {
    throw new TextLlmError(`${label} 연결에 실패했습니다. 잠시 뒤 다시 시도해 주세요.`);
  }

  if (!response.ok) {
    const reason = provider === "openai" ? await openAIErrorReason(response) : (await response.text()).slice(0, 300);
    throw new TextLlmError(`${label} API 호출 실패 (${response.status})${provider === "openai" ? reason : `: ${reason}`}`, response.status === 401 || response.status === 403 ? 400 : 500);
  }

  const data = await response.json();
  let text = "";
  if (provider === "openai") text = data?.choices?.[0]?.message?.content ?? "";
  else if (provider === "anthropic")
    text = Array.isArray(data?.content) ? data.content.filter((p: { type?: string }) => p?.type === "text").map((p: { text?: string }) => p.text ?? "").join("") : "";
  else text = (data?.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p?.text ?? "").join("");

  if (!text.trim()) throw new TextLlmError("AI로부터 응답을 받지 못했습니다.");
  return parseJsonText(text);
}
