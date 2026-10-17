import "server-only";
import { TEXT_MODEL, type RemakeRequest } from "./remake/types";
import { GeminiImageError, generateGeminiImage } from "./geminiImage";
import { compositionPrompt, restorationPrompt, suggestionPrompt } from "./remake/prompts";
export class AiError extends Error { constructor(public status: number, public code: string, message: string) { super(message); } }
export function toUserError(e: unknown) {
  if (e instanceof AiError) return { code: e.code, message: e.message, status: e.status };
  return { code: "unknown", message: "AI 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.", status: 502 };
}
async function call(apiKey: string, model: string, body: unknown) {
  let response: Response;
  try { response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey }, body: JSON.stringify(body), signal: AbortSignal.timeout(180_000), cache: "no-store" }); }
  catch { throw new AiError(504, "timeout", "AI 응답이 늦거나 연결이 끊겼습니다. 잠시 후 다시 시도해 주세요."); }
  if (!response.ok) {
    // Do not expose provider responses, which can contain user input or credentials.
    if (response.status === 429) throw new AiError(429, "quota", "본인 Gemini 계정의 사용 한도·결제 설정을 확인해 주세요.");
    if ([401, 403].includes(response.status)) throw new AiError(400, "key", "본인 Gemini API 키와 해당 모델의 사용 권한을 확인해 주세요.");
    if (response.status === 404) throw new AiError(422, "model", "이 모델을 사용할 수 없습니다. 다른 모델을 직접 선택해 주세요.");
    if (response.status === 400) throw new AiError(400, "request", "Gemini가 사진 또는 요청 형식을 처리하지 못했습니다. 사진·모델을 확인해 주세요.");
    throw new AiError(502, "provider", "Gemini 서버에서 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
  const reader = response.body?.getReader(); if (!reader) throw new AiError(502, "response", "AI 응답을 읽지 못했습니다.");
  const chunks: Uint8Array[] = []; let length = 0;
  while (true) { const p = await reader.read(); if (p.done) break; length += p.value.length; if (length > 35_000_000) { await reader.cancel(); throw new AiError(502, "response", "AI 결과가 너무 큽니다. 다시 시도해 주세요."); } chunks.push(p.value); }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { throw new AiError(502, "response", "AI 응답 형식이 올바르지 않습니다."); }
}
function parts(x: RemakeRequest) { return [x.base, ...x.objects].map(p => ({ inlineData: { data: p.data, mimeType: p.mimeType } })); }
export async function generateRemake(apiKey: string, x: RemakeRequest) {
  // 2026-10-17: 호출·대기·최종 이미지 받아오기(중간 초안 thought 조각 제외)·안전 차단 판별은 공용 기준 코드 gemini-image-client(./geminiImage — 기준은 ai-image-studio).
  // 180초 제한은 그대로이고, 재시도하면 함수 한도(300초)를 넘으므로 원래처럼 재시도 없음(retries: 0). 프롬프트·사진·비율·오류 문구는 그대로.
  let out: { base64: string; mimeType: string };
  try {
    out = await generateGeminiImage({ apiKey, modelName: x.model, parts: [...parts(x), { text: x.mode === "restore" ? restorationPrompt(x) : compositionPrompt(x) }], ...(x.aspect !== "original" ? { aspectRatio: x.aspect } : {}), responseModalities: ["TEXT", "IMAGE"], timeoutMs: 180_000, retries: 0 });
  } catch (e) {
    if (!(e instanceof GeminiImageError)) throw e;
    if (e.code === "TIMEOUT" || e.code === "NETWORK") throw new AiError(504, "timeout", "이미지 생성 응답을 받지 못했습니다. 이미지가 이미 만들어졌을 수 있으니 잠시 뒤 결과를 확인한 다음 다시 시도해 주세요.");
    if (e.code === "SAFETY_BLOCKED") throw new AiError(422, "safety", "AI가 이 사진 또는 요청을 처리할 수 없습니다. 사진·지시를 확인해 주세요.");
    if (e.code === "NO_IMAGE") throw new AiError(502, "noimage", "AI가 완성 이미지를 반환하지 않았습니다. 다른 사진 또는 지시로 다시 시도해 주세요.");
    if (e.status === 429) throw new AiError(429, "quota", "본인 Gemini 계정의 사용 한도·결제 설정을 확인해 주세요.");
    if ([401, 403].includes(e.status)) throw new AiError(400, "key", "본인 Gemini API 키와 해당 모델의 사용 권한을 확인해 주세요.");
    if (e.status === 404) throw new AiError(422, "model", "이 모델을 사용할 수 없습니다. 다른 모델을 직접 선택해 주세요.");
    if (e.status === 400) throw new AiError(400, "request", "Gemini가 사진 또는 요청 형식을 처리하지 못했습니다. 사진·모델을 확인해 주세요.");
    throw new AiError(502, "provider", "Gemini 서버에서 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
  const image = { data: out.base64, mimeType: out.mimeType };
  if (!/^image\/(jpeg|png|webp)$/.test(image.mimeType)) throw new AiError(502, "noimage", "AI가 완성 이미지를 반환하지 않았습니다. 다른 사진 또는 지시로 다시 시도해 주세요.");
  return Buffer.from(image.data, "base64");
}
export async function generateSuggestion(apiKey: string, x: RemakeRequest) {
  const response = await call(apiKey, TEXT_MODEL, { contents: { parts: [...parts(x), { text: suggestionPrompt(x) }] }, generationConfig: { maxOutputTokens: 4096 } });
  const candidate = response.candidates?.[0];
  if (candidate?.finishReason !== "STOP") throw new AiError(502, "suggestion", "합성 제안이 완성되지 않았습니다. 다시 시도해 주세요.");
  const text = candidate?.content?.parts?.filter((p: { text?: string; thought?: boolean }) => p.text && !p.thought).map((p: { text: string }) => p.text).join(" ").trim();
  if (!text || text.length > 2000) throw new AiError(502, "suggestion", "합성 제안을 읽지 못했습니다.");
  return text;
}
export async function testKey(apiKey: string) { await call(apiKey, TEXT_MODEL, { contents: "연결 확인이라고 한 단어로 답하세요.", generationConfig: { maxOutputTokens: 2048 } }); }
