// 변환 모델 한 번 호출(OpenAI·Claude·Gemini). 호출 방식 기준: emotion-writer/src/lib/studio/textLlm.ts(운영 중인 세 플랫폼 요청·응답 모양·잘림·거절 처리).
// 회원 본인 키만 받는다(키는 호출부가 읽어 넘긴다 — 운영자·다른 회원 키 폴백 없음). 유료 호출이라 **재시도하지 않는다**.
// 오류 문구에는 키·보낸 글·모델 응답 원문을 넣지 않는다.
import { openAIGenerationParams } from "./openaiRequestParams.ts";
import { CONVERT_PROVIDER_LABEL, type ConvertModel } from "./models.ts";
import { ConvertError, RESPONSE_SCHEMA } from "./protocol.ts";

export type CallOptions = {
  model: ConvertModel;
  key: string;
  system: string;
  user: string;
  signal?: AbortSignal;
  fetcher?: typeof fetch;
  /** 응답을 기다리는 시간(ms). 기본 60초 */
  timeoutMs?: number;
};

const MAX_TOKENS = 4096;

function statusError(status: number, label: string): ConvertError {
  if (status === 401 || status === 403) return new ConvertError("auth", `${label} 본인 API 키와 사용 권한을 확인해 주세요.`, 400);
  if (status === 429) return new ConvertError("busy", `${label} 호출 한도에 도달했습니다. 잠시 뒤 직접 다시 시도해 주세요.`, 429);
  if (status === 404) return new ConvertError("model", `${label}에서 고른 모델을 쓸 수 없습니다. 다른 모델을 골라 주세요.`, 400);
  return new ConvertError("upstream", `${label} 요청에 실패했습니다. 설명은 그대로 두었습니다. 잠시 뒤 직접 다시 시도해 주세요.`, 502);
}

/** 고른 모델의 플랫폼으로 **한 번** 호출하고 응답 글(JSON 문자열)을 돌려준다 */
export async function callModel({ model, key, system, user, signal, fetcher = fetch, timeoutMs = 60_000 }: CallOptions): Promise<string> {
  const label = CONVERT_PROVIDER_LABEL[model.provider];
  let url: string;
  let headers: Record<string, string>;
  let body: unknown;

  if (model.provider === "openai") {
    url = "https://api.openai.com/v1/chat/completions";
    headers = { Authorization: `Bearer ${key}` };
    body = {
      model: model.id,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      ...openAIGenerationParams(model.id, { temperature: 0.2, maxTokens: MAX_TOKENS }),
    };
  } else if (model.provider === "anthropic") {
    url = "https://api.anthropic.com/v1/messages";
    headers = { "x-api-key": key, "anthropic-version": "2023-06-01" };
    body = {
      model: model.id,
      max_tokens: MAX_TOKENS,
      system,
      messages: [{ role: "user", content: user }],
      output_config: { format: { type: "json_schema", schema: RESPONSE_SCHEMA } },
    };
  } else {
    url = `https://generativelanguage.googleapis.com/v1beta/models/${model.id}:generateContent`;
    headers = { "x-goog-api-key": key };
    body = {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: { temperature: 0.2, responseMimeType: "application/json", maxOutputTokens: MAX_TOKENS },
    };
  }

  const timeout = AbortSignal.timeout(timeoutMs);
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
    if (e instanceof Error && (e.name === "AbortError" || e.name === "TimeoutError")) throw new ConvertError("aborted", "변환이 취소됐거나 시간이 초과됐습니다. 설명은 그대로 두었습니다.", 408);
    throw new ConvertError("upstream", `${label} 연결에 실패했습니다. 설명은 그대로 두었습니다. 잠시 뒤 직접 다시 시도해 주세요.`, 502);
  }
  if (!response.ok) throw statusError(response.status, label);

  let data: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  try {
    data = await response.json();
  } catch {
    throw new ConvertError("upstream", `${label} 응답을 읽지 못했습니다. 설명은 그대로 두었습니다.`, 502);
  }
  let text = "";
  if (model.provider === "openai") text = typeof data?.choices?.[0]?.message?.content === "string" ? data.choices[0].message.content : "";
  else if (model.provider === "anthropic")
    text = Array.isArray(data?.content)
      ? data.content
          .filter((p: { type?: string }) => p?.type === "text")
          .map((p: { text?: string }) => (typeof p.text === "string" ? p.text : ""))
          .join("")
      : "";
  else text = (Array.isArray(data?.candidates?.[0]?.content?.parts) ? data.candidates[0].content.parts : []).map((p: { text?: string }) => (typeof p?.text === "string" ? p.text : "")).join("");

  if ((model.provider === "anthropic" && data?.stop_reason === "refusal") || (model.provider === "openai" && data?.choices?.[0]?.message?.refusal))
    throw new ConvertError("refused", `${label}가 이 요청을 거절했습니다. 설명을 바꾸거나 다른 모델을 골라 주세요.`, 400);
  const truncated =
    (model.provider === "openai" && data?.choices?.[0]?.finish_reason === "length") ||
    (model.provider === "anthropic" && data?.stop_reason === "max_tokens") ||
    (model.provider === "gemini" && data?.candidates?.[0]?.finishReason === "MAX_TOKENS");
  if (truncated) throw new ConvertError("mismatch", `${label} 응답이 길이 한도에서 잘려 한 줄도 쓰지 않았습니다. 설명은 그대로 두었습니다. 줄 수를 줄여 다시 시도해 주세요.`, 502);
  if (!text.trim()) throw new ConvertError("upstream", `${label}가 빈 응답을 돌려줬습니다. 설명은 그대로 두었습니다.`, 502);
  return text;
}
