import "server-only";
import type { PhotoReviewInput } from "../photoReview";
import { openAIGenerationParams } from "./openaiRequestParams";

export type ReviewImage = { mimeType: string; base64: string };
export type ReviewCall = { engine: PhotoReviewInput["engine"]; apiKey: string; system: string; user: string; images?: ReviewImage[]; signal: AbortSignal };

/** 사진 후기만의 요청. SDK 자동 재시도 없이 한 번만 호출하며 응답/키/사진을 로그에 남기지 않는다. */
export async function callPhotoReviewModel(input: ReviewCall, send: typeof fetch = fetch): Promise<string> {
  const { engine, apiKey, system, user, images = [] } = input;
  let url: string, headers: Record<string, string>, body: unknown;
  if (engine.provider === "openai") {
    url = "https://api.openai.com/v1/chat/completions";
    headers = { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` };
    body = { model: engine.model, messages: [{ role: "system", content: system }, { role: "user", content: [
      { type: "text", text: user }, ...images.map(image => ({ type: "image_url", image_url: { url: `data:${image.mimeType};base64,${image.base64}`, detail: "auto" } })),
    ] }], store: false, response_format: { type: "json_object" }, max_completion_tokens: 6000, ...openAIGenerationParams(engine.model, { temperature: 0.3 }) };
  } else if (engine.provider === "anthropic") {
    url = "https://api.anthropic.com/v1/messages";
    headers = { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" };
    body = { model: engine.model, system, max_tokens: 6000, messages: [{ role: "user", content: [
      ...images.map(image => ({ type: "image", source: { type: "base64", media_type: image.mimeType, data: image.base64 } })), { type: "text", text: user },
    ] }] };
  } else {
    url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(engine.model)}:generateContent`;
    headers = { "Content-Type": "application/json", "x-goog-api-key": apiKey };
    body = { systemInstruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts: [
      ...images.map(image => ({ inlineData: { mimeType: image.mimeType, data: image.base64 } })), { text: user },
    ] }], generationConfig: { maxOutputTokens: 6000, responseMimeType: "application/json" } };
  }
  const signal = AbortSignal.any([input.signal, AbortSignal.timeout(75_000)]);
  let response: Response;
  try { response = await send(url, { method: "POST", headers, body: JSON.stringify(body), signal, cache: "no-store", redirect: "error" }); }
  catch { throw new Error("AI 응답을 끝까지 확인하지 못했습니다. 이미 비용이 발생했을 수 있으므로 사용량을 확인해 주세요. 자동으로 다시 호출하지 않습니다."); }
  if (!response.ok) {
    const message = response.status === 401 || response.status === 403 ? "선택한 모델의 본인 API 키와 이용 권한을 확인해 주세요."
      : response.status === 429 ? "AI 요청 한도 또는 잔액을 확인해 주세요."
      : "선택한 AI 모델이 사진 후기 요청을 처리하지 못했습니다. 모델의 사진 입력 지원과 이용 상태를 확인해 주세요.";
    throw new Error(message);
  }
  const data = await response.json().catch(() => null);
  const text = engine.provider === "openai" ? data?.choices?.[0]?.message?.content
    : engine.provider === "anthropic" ? data?.content?.filter((part: { type?: string }) => part.type === "text").map((part: { text: string }) => part.text).join("")
    : data?.candidates?.[0]?.content?.parts?.filter((part: { thought?: boolean }) => !part.thought).map((part: { text?: string }) => part.text || "").join("");
  const finish = engine.provider === "openai" ? data?.choices?.[0]?.finish_reason : engine.provider === "anthropic" ? data?.stop_reason : data?.candidates?.[0]?.finishReason;
  if (typeof text !== "string" || !text.trim() || !["stop", "end_turn", "STOP"].includes(finish)) throw new Error("AI 응답이 비어 있거나 중단되었습니다. 완성된 초안으로 처리하지 않습니다. 사용량을 확인한 뒤 다시 시도해 주세요.");
  return text;
}
