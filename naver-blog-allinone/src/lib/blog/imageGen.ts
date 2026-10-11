// 이미지 생성 4개 플랫폼 호출(브라우저). 선택한 플랫폼의 본인 키만 쓴다.
//  - NanoBanana(Gemini), GPT Image(OpenAI): 브라우저에서 직접 호출
//  - FLUX 2.0, Z-Image(Replicate): Replicate API 가 브라우저 호출(CORS)을 막아 서버 중계(/api/replicate-image)를 거친다(키는 저장하지 않음)
import { generateGeminiImage, type GeneratedImage } from "./gemini";
import { finalizePrompt } from "./imagePlan";
import { KEY_LABEL, type ResolvedImageEngine } from "./models";
import type { ImageRatio } from "./types";

const OPENAI_SIZE: Record<ImageRatio, string> = {
  "1:1": "1024x1024",
  "4:5": "1024x1536",
  "16:9": "1536x1024",
  "9:16": "1024x1536",
};

function openaiMessage(status: number, detail: string): string {
  if (status === 401 || status === 403) return "OpenAI API 키 또는 이미지 모델 사용 권한을 확인해주세요(조직 인증이 필요한 모델일 수 있습니다).";
  if (status === 429) return "OpenAI 사용 한도나 크레딧이 부족합니다. 결제·한도를 확인한 뒤 다시 시도해주세요.";
  if (/safety|blocked|policy/i.test(detail)) return "안전 정책에 걸려 이미지를 만들지 못했습니다. 프롬프트를 바꿔 다시 시도해주세요.";
  return `OpenAI 이미지 생성에 실패했습니다. (${status})`;
}

async function withOpenAI(apiKey: string, model: string, prompt: string, ratio: ImageRatio, signal?: AbortSignal): Promise<GeneratedImage> {
  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, prompt: finalizePrompt(prompt), n: 1, size: OPENAI_SIZE[ratio] }),
      signal,
    });
  } catch {
    throw new Error("OpenAI 서버에 연결하지 못했습니다. 잠시 뒤 다시 시도해주세요.");
  }
  if (!res.ok) throw new Error(openaiMessage(res.status, await res.text().catch(() => "")));
  const data = (await res.json()) as { data?: { b64_json?: string; url?: string }[] };
  const item = data.data?.[0];
  if (item?.b64_json) return { base64: item.b64_json, mime: "image/png" };
  throw new Error("OpenAI 응답에 이미지가 없습니다. 다시 시도해주세요.");
}

async function withReplicate(apiKey: string, platform: "flux" | "zimage", model: string, prompt: string, ratio: ImageRatio, signal?: AbortSignal): Promise<GeneratedImage> {
  let res: Response;
  try {
    res = await fetch("/api/replicate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-replicate-key": apiKey },
      body: JSON.stringify({ platform, model, ratio, prompt: finalizePrompt(prompt) }),
      signal,
    });
  } catch {
    throw new Error("이미지 서버에 연결하지 못했습니다. 잠시 뒤 다시 시도해주세요.");
  }
  let data: { image?: string; mime?: string; error?: string } | null = null;
  try {
    data = await res.json();
  } catch {
    /* JSON 이 아닌 응답은 아래에서 일반 오류로 처리 */
  }
  if (!res.ok || !data?.image) throw new Error(data?.error || "이미지 생성에 실패했습니다. 다시 시도해주세요.");
  return { base64: data.image, mime: data.mime || "image/png" };
}

/** 선택한 이미지 엔진으로 이미지 1장을 만든다. */
export async function generateImageWith(engine: ResolvedImageEngine, prompt: string, ratio: ImageRatio, signal?: AbortSignal): Promise<GeneratedImage> {
  if (!engine.apiKey) throw new Error(`${KEY_LABEL[engine.keyProvider]} API 키가 필요합니다. [API키등록·플랫폼연동]에서 본인 키를 등록해주세요.`);
  if (engine.platform === "nanobanana") return generateGeminiImage(engine.apiKey, engine.model, prompt, ratio, signal);
  if (engine.platform === "openai") return withOpenAI(engine.apiKey, engine.model, prompt, ratio, signal);
  return withReplicate(engine.apiKey, engine.platform, engine.model, prompt, ratio, signal);
}
