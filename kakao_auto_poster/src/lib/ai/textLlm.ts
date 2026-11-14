import "server-only";
// 리포트 글 정리 서버 호출(OpenAI·Claude·Gemini). 2026-11-14.
// 호출 방식 기준: ebook-studio/src/lib/ai/textLlm.ts(세 플랫폼 요청·응답 모양), OpenAI 옵션은 공용 모듈 openai-request-params 사본.
// 회원 본인 키만 쓴다(키는 호출부가 resolveApiKey로 읽어 넘김, 운영자·다른 회원 키 폴백 없음). 유료 호출이라 자동 재시도는 하지 않는다(이중 과금 방지).
import { openAIGenerationParams, openAIErrorReason } from "./openaiRequestParams";
import { currentTextModel, textModelProvider, TEXT_PROVIDER_LABEL } from "@/lib/textModels";

/** 응답 글에서 JSON 객체만 꺼낸다(코드 울타리·앞뒤 설명 제거). */
export function parseJsonText(raw: string): unknown {
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error("AI 응답을 JSON으로 해석하지 못했습니다.");
  }
}

type GenerateOptions = {
  model: unknown;
  key: string;
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  /** Claude 구조화 응답 스키마(JSON Schema, additionalProperties: false). 주면 Claude가 이 모양의 JSON만 돌려준다. */
  schema?: Record<string, unknown>;
  fetcher?: typeof fetch;
};

/** 고른 모델의 플랫폼으로 한 번 호출하고 JSON 결과를 돌려준다. */
export async function generateTextJson({ model: modelInput, key, system, user, temperature = 0.4, maxTokens = 3000, schema, fetcher = fetch }: GenerateOptions): Promise<unknown> {
  const model = currentTextModel(modelInput);
  const provider = textModelProvider(model);
  const label = TEXT_PROVIDER_LABEL[provider];
  let url: string;
  let headers: Record<string, string>;
  let body: unknown;

  if (provider === "openai") {
    url = "https://api.openai.com/v1/chat/completions";
    headers = { Authorization: `Bearer ${key}` };
    body = {
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      ...openAIGenerationParams(model, { temperature, maxTokens }),
    };
  } else if (provider === "anthropic") {
    url = "https://api.anthropic.com/v1/messages";
    headers = { "x-api-key": key, "anthropic-version": "2023-06-01" };
    body = {
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
      // 구조화 응답(output_config.format) — 코드 울타리·설명 없이 스키마 모양의 JSON만 받는다.
      ...(schema ? { output_config: { format: { type: "json_schema", schema } } } : {}),
    };
  } else {
    url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    headers = { "x-goog-api-key": key };
    body = {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: { temperature, responseMimeType: "application/json" },
    };
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
    throw new Error(`${label} 연결에 실패했습니다. 잠시 뒤 다시 시도해 주세요.`);
  }

  if (!response.ok) {
    const reason = provider === "openai" ? await openAIErrorReason(response) : `: ${(await response.text()).slice(0, 300)}`;
    throw new Error(`AI 구조화 요청이 실패했습니다. ${label} (${response.status})${reason}`);
  }

  const data = await response.json();
  let text = "";
  if (provider === "openai") text = data?.choices?.[0]?.message?.content ?? "";
  else if (provider === "anthropic")
    text = Array.isArray(data?.content) ? data.content.filter((p: { type?: string }) => p?.type === "text").map((p: { text?: string }) => p.text ?? "").join("") : "";
  else text = (data?.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p?.text ?? "").join("");

  const truncated =
    (provider === "openai" && data?.choices?.[0]?.finish_reason === "length") ||
    (provider === "anthropic" && data?.stop_reason === "max_tokens") ||
    (provider === "gemini" && data?.candidates?.[0]?.finishReason === "MAX_TOKENS");
  if (provider === "anthropic" && data?.stop_reason === "refusal") throw new Error(`${label}가 이 요청을 거절했습니다. 주제·키워드를 바꾸거나 다른 모델을 골라 주세요.`);
  if (!text.trim()) throw new Error("AI가 빈 응답을 반환했습니다.");
  if (truncated) throw new Error(`${label} 응답이 길이 한도에서 잘렸습니다. 잠시 뒤 다시 시도하거나 다른 모델을 골라 주세요.`);
  return parseJsonText(text);
}
