// 글귀 생성 서버 호출(OpenAI·Claude·Gemini). 2026-11-18 ECOM-20261118-01.
// 호출 방식 기준: kakao_auto_poster/src/lib/ai/textLlm.ts(세 플랫폼 요청·응답 모양·잘림·거절 처리), OpenAI 옵션은 공용 모듈 openai-request-params 사본.
// 회원 본인 키만 쓴다(키는 호출부가 getUserApiKey로 읽어 넘김, 운영자·다른 회원 키 폴백 없음). 유료 호출이라 자동 재시도는 하지 않는다(이중 과금 방지).
// 이 프로그램에 맞춘 것: 요청 취소 신호(parent) 연결, 오류는 기존 AppError 문구(키·한도·모델 없음)로.
import { openAIGenerationParams } from "./openaiRequestParams";
import { currentTextModel, textModelProvider, TEXT_PROVIDER_LABEL } from "./textModels";
import { AppError } from "./validation";

type GenerateOptions = {
  model: unknown;
  key: string;
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  /** Claude 구조화 응답 스키마(JSON Schema, additionalProperties: false). */
  schema?: Record<string, unknown>;
  signal?: AbortSignal;
  fetcher?: typeof fetch;
};

function statusError(status: number, label: string): AppError {
  if ([401, 403].includes(status)) return new AppError(`${label} 본인 API 키와 사용 권한을 확인해 주세요.`, 400);
  if (status === 429) return new AppError(`${label} 호출 한도에 도달했습니다. 잠시 뒤 다시 시도해 주세요.`, 429);
  if (status === 404) return new AppError(`${label}에서 선택한 모델을 사용할 수 없습니다. 모델 선택과 계정 권한을 확인해 주세요.`, 400);
  return new AppError(`${label} 요청에 실패했습니다. 잠시 뒤 다시 시도해 주세요.`, 502);
}

/** 고른 모델의 플랫폼으로 한 번 호출하고 응답 글(JSON 문자열)을 돌려준다. */
export async function generateText({ model: modelInput, key, system, user, temperature = 0.9, maxTokens = 4096, schema, signal, fetcher = fetch }: GenerateOptions): Promise<string> {
  const model = String(currentTextModel(modelInput));
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
      ...(schema ? { output_config: { format: { type: "json_schema", schema } } } : {}),
    };
  } else {
    url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    headers = { "x-goog-api-key": key };
    body = {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: { temperature, responseMimeType: "application/json", maxOutputTokens: maxTokens },
    };
  }

  const timeout = AbortSignal.timeout(110_000);
  let response: Response;
  try {
    response = await fetcher(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
  } catch (e) {
    // QA046 P3: 취소·시간초과는 그대로 던져 guard가 408로 구분하게 한다(502로 바꾸지 않음).
    if (e instanceof Error && ["AbortError", "TimeoutError"].includes(e.name)) throw e;
    throw new AppError(`${label} 연결에 실패했습니다. 잠시 뒤 다시 시도해 주세요.`, 502);
  }
  if (!response.ok) throw statusError(response.status, label);

  const data = await response.json();
  let text = "";
  if (provider === "openai") text = data?.choices?.[0]?.message?.content ?? "";
  else if (provider === "anthropic")
    text = Array.isArray(data?.content) ? data.content.filter((p: { type?: string }) => p?.type === "text").map((p: { text?: string }) => p.text ?? "").join("") : "";
  else text = (data?.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p?.text ?? "").join("");

  // QA046 P2: OpenAI가 거절 문구(message.refusal)를 주면 content가 함께 와도 쓰지 않는다(실제 발생 여부는 미검증, 방어 경계).
  if ((provider === "anthropic" && data?.stop_reason === "refusal") || (provider === "openai" && data?.choices?.[0]?.message?.refusal))
    throw new AppError(`${label}가 이 요청을 거절했습니다. 주제를 바꾸거나 다른 모델을 골라 주세요.`, 400);
  const truncated =
    (provider === "openai" && data?.choices?.[0]?.finish_reason === "length") ||
    (provider === "anthropic" && data?.stop_reason === "max_tokens") ||
    (provider === "gemini" && data?.candidates?.[0]?.finishReason === "MAX_TOKENS");
  if (!text.trim()) throw new AppError(`${label}가 빈 응답을 돌려줬습니다. 다시 생성해 주세요.`, 502);
  if (truncated) throw new AppError(`${label} 응답이 길이 한도에서 잘렸습니다. 다시 생성하거나 다른 모델을 골라 주세요.`, 502);
  return text;
}
