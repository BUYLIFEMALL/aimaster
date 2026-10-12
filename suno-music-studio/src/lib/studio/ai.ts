import type { Provider } from "./config";
import { AppError } from "./validation";
type Json = {
  stop_reason?: string;
  content?: { type: string; text?: string }[];
  choices?: { finish_reason: string; message: { content?: string } }[];
  candidates?: {
    finishReason: string;
    content?: { parts: { text?: string }[] };
  }[];
};
export async function callModel(
  provider: Provider,
  model: string,
  key: string,
  system: string,
  user: string,
  signal: AbortSignal,
  send: typeof fetch = fetch,
): Promise<string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  let url: string;
  let body: unknown;
  if (provider === "gemini") {
    url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    headers["x-goog-api-key"] = key;
    body = {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: {
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
      },
    };
  } else if (provider === "anthropic") {
    url = "https://api.anthropic.com/v1/messages";
    headers["x-api-key"] = key;
    headers["anthropic-version"] = "2023-06-01";
    body = {
      model,
      max_tokens: 8192,
      system,
      messages: [{ role: "user", content: user }],
    };
  } else {
    url = "https://api.openai.com/v1/chat/completions";
    headers.Authorization = `Bearer ${key}`;
    body = {
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 8192,
    };
  }
  const response = await send(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.any([signal, AbortSignal.timeout(110000)]),
  });
  if (!response.ok) {
    if ([401, 403].includes(response.status))
      throw new AppError(
        "본인 API 키와 선택 모델의 사용 권한을 확인해 주세요.",
        400,
      );
    if (response.status === 429)
      throw new AppError(
        "본인 API 사용 한도 또는 호출 빈도를 초과했습니다. 잠시 뒤 다시 시도해 주세요.",
        429,
      );
    throw new AppError(
      `AI 요청이 실패했습니다 (${response.status}). 기존 결과는 유지됩니다.`,
      502,
    );
  }
  const data: Json = await response.json();
  if (
    data.stop_reason === "max_tokens" ||
    data.choices?.[0]?.finish_reason === "length" ||
    data.candidates?.[0]?.finishReason === "MAX_TOKENS"
  )
    throw new AppError(
      "AI 출력 길이 한도를 넘었습니다. 곡 수나 상세 의도를 줄여 주세요.",
      502,
    );
  const raw =
    provider === "gemini"
      ? data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("")
      : provider === "anthropic"
        ? data.content
            ?.filter((c) => c.type === "text")
            .map((c) => c.text || "")
            .join("\n")
        : data.choices?.[0]?.message?.content;
  if (!raw?.trim())
    throw new AppError(
      "AI가 빈 결과를 반환했습니다. 기존 결과는 유지됩니다.",
      502,
    );
  return raw;
}
export async function testKey(
  provider: Provider,
  model: string,
  key: string,
  signal: AbortSignal,
) {
  const url =
    provider === "gemini"
      ? `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}`
      : provider === "openai"
        ? `https://api.openai.com/v1/models/${encodeURIComponent(model)}`
        : `https://api.anthropic.com/v1/models/${encodeURIComponent(model)}`;
  const headers: Record<string, string> =
    provider === "gemini"
      ? { "x-goog-api-key": key }
      : provider === "openai"
        ? { Authorization: `Bearer ${key}` }
        : { "x-api-key": key, "anthropic-version": "2023-06-01" };
  const r = await fetch(url, {
    headers,
    cache: "no-store",
    signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
  });
  if (!r.ok)
    throw new AppError("본인 API 키와 모델 조회 권한을 확인해 주세요.");
}
