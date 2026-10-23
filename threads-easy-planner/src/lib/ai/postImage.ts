import "server-only";

// 글 이미지 생성(2026-10-23 v1.48) — Threads 콘텐츠 운영(threads-content-ops/lib/postImage.ts)의 나노바나나·GPT Image 생성 방식을 옮겼다.
// 호출·대기·이미지 받기: 나노바나나는 공용 기준 사본 gemini-image-client(./geminiImage)·gemini-image-models(./nanoBananaModels), 기준은 ai-image-studio.
// 회원 본인 Gemini·OpenAI 키만 쓴다(운영자 키 폴백 없음). 이미지 프롬프트 내용은 이 프로그램 고유(generator.ts planImagePromptsAI).
import { getNanoBananaConfig } from "./nanoBananaModels";
import { generateGeminiImage } from "./geminiImage";
import { findImageModel, type ImageRatio } from "./imageModels";

const KOREAN_PEOPLE_RULE = "If the scene includes any people, depict them as Korean people by default.";
const NO_TEXT_RULE = "No visible text, letters, captions, logos, brand names, or watermarks anywhere in the image.";

export interface ImageBytes {
  bytes: Buffer;
  mime: string;
}

/** 프롬프트 끝에 공통 규칙(인물은 한국인, 글자·로고 금지)을 붙인다 — docs/IMAGE_PROMPT_RULES.md 규칙 3·11·12 */
export function finalizeImagePrompt(prompt: string): string {
  return `${prompt.trim().slice(0, 1_500)}\n\n${KOREAN_PEOPLE_RULE} ${NO_TEXT_RULE}`;
}

function openAIErrorMessage(status: number, detail: string): string {
  if (status === 401 || status === 403) return "OpenAI API 키 또는 이미지 모델 사용 권한을 확인해 주세요. (조직 인증이 필요한 모델이면 다른 이미지 모델을 골라 주세요)";
  if (status === 429) return "OpenAI 사용 한도(크레딧·분당 요청)에 도달했습니다. 결제·한도를 확인한 뒤 다시 시도해 주세요.";
  if (/safety|blocked|policy|moderation/i.test(detail)) return "안전 정책에 걸려 이미지를 만들지 못했습니다. 글 내용을 바꾸거나 다시 시도해 주세요.";
  return `이미지 생성에 실패했습니다. (OpenAI ${status})`;
}

async function withGemini(model: string, ratio: ImageRatio, prompt: string, apiKey: string): Promise<ImageBytes> {
  const config = getNanoBananaConfig(model);
  // 유료 생성이라 시간 초과는 재시도하지 않는다(공용 모듈 기본 — 이중 과금 방지). 1장 110초 안.
  const image = await generateGeminiImage({
    apiKey,
    modelName: config.modelName,
    prompt,
    aspectRatio: ratio,
    imageSize: config.imageSize,
    temperature: config.temperature,
    responseModalities: ["Image"],
    timeoutMs: 110_000,
  });
  return { bytes: Buffer.from(image.base64, "base64"), mime: image.mimeType };
}

const OPENAI_SIZE: Record<ImageRatio, string> = { "1:1": "1024x1024", "4:5": "1024x1536" };

async function withOpenAI(model: string, ratio: ImageRatio, prompt: string, apiKey: string): Promise<ImageBytes> {
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, prompt, n: 1, size: OPENAI_SIZE[ratio] }),
    cache: "no-store",
    signal: AbortSignal.timeout(110_000),
  });
  if (!response.ok) throw new Error(openAIErrorMessage(response.status, await response.text().catch(() => "")));
  const data = (await response.json()) as { data?: { b64_json?: string; url?: string }[] };
  const item = data.data?.[0];
  if (item?.b64_json) return { bytes: Buffer.from(item.b64_json, "base64"), mime: "image/png" };
  if (item?.url) {
    // 모델에 따라 주소로 돌려주는 경우: OpenAI가 준 https 주소만 내려받는다.
    const url = new URL(item.url);
    if (url.protocol !== "https:" || !/(^|\.)(oaiusercontent\.com|openai\.com|blob\.core\.windows\.net)$/.test(url.hostname)) {
      throw new Error("OpenAI가 예상하지 못한 주소를 돌려주어 이미지를 가져오지 않았습니다.");
    }
    const file = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(30_000) });
    if (!file.ok) throw new Error("생성된 이미지를 가져오지 못했습니다. 다시 시도해 주세요.");
    return { bytes: Buffer.from(await file.arrayBuffer()), mime: file.headers.get("content-type")?.split(";")[0] || "image/png" };
  }
  throw new Error("OpenAI 응답에 이미지가 없습니다. 다시 시도해 주세요.");
}

export async function generateImageBytes(params: { model: string; ratio: ImageRatio; prompt: string; apiKey: string }): Promise<ImageBytes> {
  const info = findImageModel(params.model);
  if (!info) throw new Error("지원하지 않는 이미지 모델입니다.");
  const prompt = finalizeImagePrompt(params.prompt);
  return info.engine === "gemini"
    ? withGemini(params.model, params.ratio, prompt, params.apiKey)
    : withOpenAI(params.model, params.ratio, prompt, params.apiKey);
}
