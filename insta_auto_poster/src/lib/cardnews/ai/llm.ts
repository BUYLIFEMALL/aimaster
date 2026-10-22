// 공급사 REST 호출(SDK 없이). 회원 본인 키로만 호출하며 키는 로그·오류 메시지에 남기지 않는다.
// 테스트에서 fetch를 바꿔 끼울 수 있도록 fetchImpl 을 받는다.
import { openAIGenerationParams } from "./openaiRequestParams";

export type LlmProvider = "gemini" | "openai" | "anthropic";

export interface LlmRequest {
  provider: LlmProvider;
  model: string;
  apiKey: string;
  system: string;
  user: string;
  /** Gemini만: 공개 YouTube 주소를 넘기면 모델이 영상을 직접 본다 */
  videoUrl?: string;
  /** JSON 응답을 요청한다(Gemini responseMimeType, OpenAI json_object). 프롬프트에 JSON이라는 말이 있어야 한다. */
  json?: boolean;
  /** 함께 볼 이미지(base64, 떡상 레퍼런스 화면 캡처 등). 세 공급사 모두 지원 */
  images?: { mimeType: string; data: string }[];
  /** Gemini만: 함께 들을 음성(base64, 릴스에서 브라우저가 뽑은 WAV — v1.49) */
  audio?: { mimeType: string; data: string };
}

export class LlmError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = "LlmError";
    this.status = status;
  }
}

function scrub(text: string, apiKey: string): string {
  let out = text;
  if (apiKey) out = out.split(apiKey).join("***");
  return out.replace(/key=[^&\s"]+/gi, "key=***").slice(0, 300);
}

function mapError(provider: LlmProvider, status: number, apiMessage: string, apiKey: string): LlmError {
  const detail = scrub(apiMessage || "", apiKey);
  const name = provider === "gemini" ? "Gemini" : provider === "openai" ? "OpenAI" : "Claude";
  if (status === 401 || status === 403) {
    return new LlmError(`${name} API 키가 올바르지 않거나 이 모델을 쓸 권한이 없습니다. 설정에서 본인 키를 확인해주세요. (${detail})`, 400);
  }
  if (status === 404) {
    return new LlmError(`${name} 계정에서 이 모델을 사용할 수 없습니다. 다른 모델을 선택해보세요. (${detail})`, 400);
  }
  if (status === 429) {
    return new LlmError(`${name} 사용 한도나 잔액을 초과했습니다. 잠시 뒤 다시 시도하거나 ${name} 계정의 한도를 확인해주세요. (${detail})`, 429);
  }
  return new LlmError(`${name} 호출에 실패했습니다. (${status}) ${detail}`, 502);
}

export async function callLlm(req: LlmRequest, fetchImpl: typeof fetch = fetch): Promise<string> {
  const { provider, model, apiKey, system, user, videoUrl, json } = req;
  const images = req.images ?? [];

  let url: string;
  let headers: Record<string, string>;
  let body: unknown;

  if (provider === "gemini") {
    url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    headers = { "Content-Type": "application/json", "x-goog-api-key": apiKey };
    const parts: unknown[] = [];
    if (videoUrl) parts.push({ fileData: { fileUri: videoUrl } });
    for (const img of images) parts.push({ inlineData: { mimeType: img.mimeType, data: img.data } });
    if (req.audio) parts.push({ inlineData: { mimeType: req.audio.mimeType, data: req.audio.data } });
    parts.push({ text: user });
    body = {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts }],
      generationConfig: { temperature: 0.8, ...(json ? { responseMimeType: "application/json" } : {}) },
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
            ? [...images.map((img) => ({ type: "image_url", image_url: { url: `data:${img.mimeType};base64,${img.data}` } })), { type: "text", text: user }]
            : user,
        },
      ],
      // 샘플링 설정은 기존 비추론 계열(gpt-4*)에만 보낸다.
      ...openAIGenerationParams(model, { temperature: 0.8 }),
      ...(json ? { response_format: { type: "json_object" } } : {}),
    };
  } else {
    url = "https://api.anthropic.com/v1/messages";
    headers = { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" };
    const content = images.length
      ? [...images.map((img) => ({ type: "image", source: { type: "base64", media_type: img.mimeType, data: img.data } })), { type: "text", text: user }]
      : user;
    body = { model, max_tokens: 8192, system, messages: [{ role: "user", content }] };
  }

  let res: Response;
  try {
    res = await fetchImpl(url, { method: "POST", headers, body: JSON.stringify(body), cache: "no-store" });
  } catch {
    throw new LlmError("AI 서버에 연결하지 못했습니다. 잠시 뒤 다시 시도해주세요.", 502);
  }

  let data: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const apiMessage = data?.error?.message ?? (typeof data?.error === "string" ? data.error : "");
    throw mapError(provider, res.status, apiMessage, apiKey);
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
    // 원인을 알 수 있게 응답 종료 사유와 블록 종류만 덧붙인다(내용·키는 넣지 않는다).
    const hint =
      provider === "anthropic"
        ? `stop_reason=${data?.stop_reason ?? "?"}, blocks=${(data?.content ?? []).map((b: { type: string }) => b.type).join(",") || "없음"}`
        : provider === "gemini"
          ? `finishReason=${data?.candidates?.[0]?.finishReason ?? "?"}, blockReason=${data?.promptFeedback?.blockReason ?? "-"}`
          : `finish_reason=${data?.choices?.[0]?.finish_reason ?? "?"}`;
    throw new LlmError(`AI가 빈 응답을 돌려줬습니다. 다른 모델로 다시 시도해주세요. (${hint})`, 502);
  }
  return text.trim();
}
