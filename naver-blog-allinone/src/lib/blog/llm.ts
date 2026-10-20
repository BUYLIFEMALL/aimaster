// 글 생성 공용 호출: Gemini / OpenAI(GPT) / Anthropic(Claude). 회원 본인 키를 이 브라우저에서 직접 쓴다(올인원의 기존 방식).
// 선택한 공급사만 호출하고 다른 공급사로 몰래 바꾸지 않는다(naver-blog-agent 와 같은 원칙). 키는 오류 문구에 넣지 않는다.
import { openAIGenerationParams } from "./openaiRequestParams";

export type TextProvider = "gemini" | "openai" | "anthropic";

export interface InlineImage {
  mime: string;
  /** data: 접두사 없는 base64 */
  base64: string;
}

export interface LlmRequest {
  provider: TextProvider;
  model: string;
  apiKey: string;
  system: string;
  user: string;
  /** 분석할 사진들(맛집/카페/여행 탭). 세 공급사 모두 이미지 입력을 지원하는 모델만 쓴다. */
  images?: InlineImage[];
  json?: boolean;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

export const PROVIDER_LABEL: Record<TextProvider, string> = { gemini: "Gemini", openai: "OpenAI(GPT)", anthropic: "Claude" };

function scrub(text: string, apiKey: string): string {
  let out = text;
  if (apiKey) out = out.split(apiKey).join("***");
  return out.replace(/key=[^&\s"]+/gi, "key=***").slice(0, 200);
}

/** 공급사 오류를 회원이 이해할 수 있는 한 문장으로 바꾼다. */
export function describeHttpError(provider: TextProvider, status: number, apiMessage: string, apiKey: string): string {
  const name = PROVIDER_LABEL[provider];
  const detail = scrub(apiMessage || "", apiKey);
  if (/credit balance|insufficient[_ ]quota|billing|no credits/i.test(apiMessage)) return `${name} 크레딧 또는 사용 한도가 부족합니다. 해당 서비스의 결제·한도를 확인해주세요.`;
  if (status === 401 || status === 403 || (status === 400 && /api key/i.test(apiMessage))) return `${name} API 키가 올바르지 않거나 이 모델을 쓸 권한이 없습니다. 본인 키를 확인해주세요.`;
  if (status === 404) return `${name} 계정에서 이 모델을 사용할 수 없습니다. 다른 모델을 선택해보세요. (${detail})`;
  if (status === 429) return `${name} 요청 한도를 넘었습니다. 잠시 뒤 다시 시도하거나 사용 한도를 확인해주세요.`;
  return `${name} 호출에 실패했습니다. (${status}) ${detail}`;
}

export async function callLlm(req: LlmRequest, fetchImpl: typeof fetch = fetch): Promise<string> {
  const { provider, model, apiKey, system, user, images = [], json, signal } = req;
  const temperature = req.temperature ?? 0.7;
  const maxTokens = req.maxTokens ?? 8192;

  let url: string;
  let headers: Record<string, string>;
  let body: unknown;

  if (provider === "gemini") {
    url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    headers = { "Content-Type": "application/json", "x-goog-api-key": apiKey };
    body = {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [...images.map((i) => ({ inlineData: { mimeType: i.mime, data: i.base64 } })), { text: user }] }],
      generationConfig: { temperature, maxOutputTokens: maxTokens, ...(json ? { responseMimeType: "application/json" } : {}) },
    };
  } else if (provider === "openai") {
    url = "https://api.openai.com/v1/chat/completions";
    headers = { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` };
    body = {
      model,
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: images.length
            ? [{ type: "text", text: user }, ...images.map((i) => ({ type: "image_url", image_url: { url: `data:${i.mime};base64,${i.base64}` } }))]
            : user,
        },
      ],
      // 샘플링 설정은 기존 비추론 계열(gpt-4*)에만 보낸다.
      ...openAIGenerationParams(model, { temperature }),
      ...(json ? { response_format: { type: "json_object" } } : {}),
    };
  } else {
    url = "https://api.anthropic.com/v1/messages";
    headers = {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      // 브라우저에서 회원 본인 키로 직접 호출하기 위한 Anthropic 공식 헤더
      "anthropic-dangerous-direct-browser-access": "true",
    };
    body = {
      model,
      max_tokens: Math.max(maxTokens, 8192),
      system,
      messages: [
        {
          role: "user",
          content: images.length
            ? [...images.map((i) => ({ type: "image", source: { type: "base64", media_type: i.mime, data: i.base64 } })), { type: "text", text: user }]
            : user,
        },
      ],
    };
  }

  let res: Response;
  try {
    res = await fetchImpl(url, { method: "POST", headers, body: JSON.stringify(body), signal });
  } catch {
    throw new Error(`${PROVIDER_LABEL[provider]} 서버에 연결하지 못했습니다. 네트워크를 확인하고 다시 시도해주세요.`);
  }

  let data: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const apiMessage = data?.error?.message ?? (typeof data?.error === "string" ? data.error : "");
    throw new Error(describeHttpError(provider, res.status, apiMessage, apiKey));
  }

  let text = "";
  if (provider === "gemini") {
    const parts: { text?: string }[] = data?.candidates?.[0]?.content?.parts ?? [];
    text = parts.map((p) => p.text ?? "").join("");
  } else if (provider === "openai") {
    text = data?.choices?.[0]?.message?.content ?? "";
  } else {
    const blocks: { type: string; text?: string }[] = data?.content ?? [];
    text = blocks.filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
  }
  if (!text.trim()) {
    const hint =
      provider === "anthropic"
        ? `stop_reason=${data?.stop_reason ?? "?"}`
        : provider === "gemini"
          ? `finishReason=${data?.candidates?.[0]?.finishReason ?? "?"}, blockReason=${data?.promptFeedback?.blockReason ?? "-"}`
          : `finish_reason=${data?.choices?.[0]?.finish_reason ?? "?"}`;
    throw new Error(`${PROVIDER_LABEL[provider]}가 빈 응답을 돌려줬습니다. 다시 시도하거나 다른 모델을 선택해주세요. (${hint})`);
  }
  return text.trim();
}
