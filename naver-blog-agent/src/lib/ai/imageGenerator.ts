import "server-only";

import { findImageModel, type ImagePlatform, type ImageRatio } from "./contentModels";

const KOREAN_PEOPLE_RULE = "If the scene includes any people, depict them as Korean/East Asian people by default.";
const NO_TEXT_RULE = "No visible text, letters, words, captions, logos, or watermarks anywhere in the image.";

export function finalizePrompt(prompt: string): string {
  return `${prompt.trim().slice(0, 1500)}\n\n${KOREAN_PEOPLE_RULE} ${NO_TEXT_RULE}`;
}

function imageErrorMessage(status: number, name: string, detail: string): string {
  if (status === 401 || status === 403) return `${name} API 키 또는 이미지 생성 모델 사용 권한을 확인해 주세요.`;
  if (status === 429) return `${name} API 할당량 또는 분당 요청 한도에 도달했습니다. 결제·사용 한도를 확인한 뒤 다시 시도해 주세요.`;
  if (/safety|blocked|policy/i.test(detail)) return "안전 정책에 걸려 이미지를 만들지 못했습니다. 다른 프롬프트로 다시 시도해 주세요.";
  return `이미지 생성에 실패했습니다. (${name} ${status})`;
}

export type ImageBytes = { bytes: Buffer; mime: string };

// ---- 1. NanoBanana (Google Gemini) ----
const NANO_BANANA: Record<string, { model: string; size: "1K" | "2K" | "4K"; temperature: number }> = {
  nanobanana: { model: "gemini-2.5-flash-image", size: "1K", temperature: 0.7 },
  "nanobanana-2-2k": { model: "gemini-3.1-flash-image", size: "2K", temperature: 0.7 },
  "nanobanana-2-4k": { model: "gemini-3.1-flash-image", size: "4K", temperature: 0.7 },
  "nanobanana-pro": { model: "gemini-3.1-flash-image", size: "4K", temperature: 0.4 },
};

async function withGemini(model: string, ratio: ImageRatio, prompt: string, apiKey: string): Promise<ImageBytes> {
  const config = NANO_BANANA[model] ?? NANO_BANANA["nanobanana-2-2k"];
  const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/${config.model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ["Image"],
        imageConfig: { aspectRatio: ratio, imageSize: config.size },
        temperature: config.temperature,
      },
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(110_000),
  });
  if (!response.ok) throw new Error(imageErrorMessage(response.status, "Gemini", await response.text().catch(() => "")));
  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { inlineData?: { data?: string; mimeType?: string } }[] } }[];
  };
  const part = data.candidates?.[0]?.content?.parts?.find((item) => item.inlineData?.data);
  if (!part?.inlineData?.data) throw new Error("NanoBanana 응답에 이미지가 없습니다. 안전 정책에 걸렸을 수 있으니 다시 시도해 주세요.");
  return {
    bytes: Buffer.from(part.inlineData.data.replace(/\s+/g, ""), "base64"),
    mime: part.inlineData.mimeType || "image/png",
  };
}

// ---- 2. GPT Image (OpenAI) ----
const OPENAI_SIZE: Record<ImageRatio, string> = {
  "1:1": "1024x1024",
  "4:5": "1024x1536",
  "16:9": "1536x1024",
  "9:16": "1024x1536",
};

async function withOpenAI(model: string, ratio: ImageRatio, prompt: string, apiKey: string): Promise<ImageBytes> {
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, prompt, n: 1, size: OPENAI_SIZE[ratio] }),
    cache: "no-store",
    signal: AbortSignal.timeout(110_000),
  });
  if (!response.ok) throw new Error(imageErrorMessage(response.status, "OpenAI", await response.text().catch(() => "")));
  const data = (await response.json()) as { data?: { b64_json?: string; url?: string }[] };
  const item = data.data?.[0];
  if (item?.b64_json) return { bytes: Buffer.from(item.b64_json, "base64"), mime: "image/png" };
  if (item?.url) {
    const url = new URL(item.url);
    if (!/(^|\.)(oaiusercontent\.com|openai\.com|blob\.core\.windows\.net)$/.test(url.hostname)) {
      throw new Error("OpenAI에서 올바르지 않은 주소를 반환했습니다.");
    }
    const file = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(30_000) });
    if (!file.ok) throw new Error("생성된 이미지를 가져오지 못했습니다. 다시 시도해 주세요.");
    return {
      bytes: Buffer.from(await file.arrayBuffer()),
      mime: file.headers.get("content-type")?.split(";")[0] || "image/png",
    };
  }
  throw new Error("OpenAI 응답에 이미지가 없습니다. 다시 시도해 주세요.");
}

// ---- 3. FLUX 2.0 / Z-Image (Replicate) ----
const Z_SIZE: Record<ImageRatio, { width: number; height: number }> = {
  "1:1": { width: 1024, height: 1024 },
  "4:5": { width: 896, height: 1120 },
  "16:9": { width: 1280, height: 720 },
  "9:16": { width: 720, height: 1280 },
};

function assertReplicateDelivery(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Replicate가 올바르지 않은 이미지 주소를 돌려주었습니다.");
  }
  if (url.protocol !== "https:" || !(url.hostname === "replicate.delivery" || url.hostname.endsWith(".replicate.delivery"))) {
    throw new Error("Replicate가 예상하지 못한 주소를 돌려주어 이미지를 가져오지 않았습니다.");
  }
  return url;
}

async function withReplicate(platform: "flux" | "zimage", model: string, ratio: ImageRatio, prompt: string, apiKey: string): Promise<ImageBytes> {
  const key = apiKey.trim().replace(/^(Bearer|Token)\s+/i, "");
  const headers = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const baseInput: Record<string, unknown> = platform === "zimage" ? { prompt, ...Z_SIZE[ratio] } : { prompt, aspect_ratio: ratio, go_fast: true };
  const create = (input: Record<string, unknown>) =>
    fetch(`https://api.replicate.com/v1/models/${model}/predictions`, {
      method: "POST",
      headers: { ...headers, Prefer: "wait=55" },
      body: JSON.stringify({ input }),
      cache: "no-store",
      signal: AbortSignal.timeout(110_000),
    });

  let created = await create({ ...baseInput, output_format: "png" });
  if (created.status === 422) created = await create(baseInput);
  if (!created.ok) throw new Error(imageErrorMessage(created.status, "Replicate", await created.text().catch(() => "")));

  type Prediction = { status?: string; output?: string | string[]; error?: string; urls?: { get?: string } };
  let prediction = (await created.json()) as Prediction;
  for (let attempt = 0; attempt < 25 && prediction.status !== "succeeded"; attempt += 1) {
    if (prediction.status === "failed" || prediction.status === "canceled") {
      throw new Error(`Replicate 이미지 생성에 실패했습니다. (${prediction.error ?? prediction.status})`);
    }
    const pollUrl = prediction.urls?.get;
    if (!pollUrl || !pollUrl.startsWith("https://api.replicate.com/")) {
      throw new Error("Replicate 응답에서 진행 상태 주소를 찾지 못했습니다.");
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const poll = await fetch(pollUrl, { headers: { Authorization: headers.Authorization }, cache: "no-store", signal: AbortSignal.timeout(20_000) });
    if (poll.ok) prediction = (await poll.json()) as Prediction;
  }
  if (prediction.status !== "succeeded") throw new Error("Replicate 이미지 생성 시간이 초과되었습니다. 잠시 뒤 다시 시도해 주세요.");

  const output = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
  if (!output) throw new Error("Replicate 응답에 이미지가 없습니다. 다시 시도해 주세요.");
  const file = await fetch(assertReplicateDelivery(output), { cache: "no-store", signal: AbortSignal.timeout(30_000) });
  if (!file.ok) throw new Error("생성된 이미지를 Replicate에서 가져오지 못했습니다. 다시 시도해 주세요.");
  return { bytes: Buffer.from(await file.arrayBuffer()), mime: file.headers.get("content-type")?.split(";")[0] || "image/png" };
}

export async function generateImageBytes(params: {
  model: string;
  ratio: ImageRatio;
  prompt: string;
  apiKey: string;
}): Promise<ImageBytes> {
  const info = findImageModel(params.model);
  if (!info) throw new Error("지원하지 않는 이미지 생성 모델입니다.");
  const prompt = finalizePrompt(params.prompt);
  const platform: ImagePlatform = info.platform;
  if (platform === "nanobanana") return withGemini(params.model, params.ratio, prompt, params.apiKey);
  if (platform === "openai") return withOpenAI(params.model, params.ratio, prompt, params.apiKey);
  return withReplicate(platform, params.model, params.ratio, prompt, params.apiKey);
}
