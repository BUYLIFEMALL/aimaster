// [이미지 모델 교체 2026-10-17] 구형(gemini-2.5-flash-image·gemini-3.1-flash-image·*-preview) → 최신 정식(gemini-nano-banana-2.1·gemini-3-pro-image), 기준: ai-image-studio v1.11 lib/providers/adapters/gemini.ts.
// 실제 이미지 생성 시험은 하지 않았음 — 이미지 생성 오류가 나면 그때 테스트 검증한다(주인님 지시).
import "server-only";
import OpenAI from "openai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ImageProvider } from "./imageModels";
import { generateGeminiImage } from "./geminiImage";
import { getNanoBananaConfig, type NanoBananaModelType } from "./nanoBananaModels";

const KOREAN_DEFAULT_PEOPLE_INSTRUCTION =
  "If this scene includes any human figures, depict them as Korean/East Asian people by default. Only depict a different ethnicity/nationality if the prompt above explicitly names a specific foreign celebrity, politician, entertainer, or athlete, or explicitly describes a foreign country/setting.";

interface GenerateImageParams {
  prompt: string;
  provider: ImageProvider;
  model: string;
  apiKey: string;
  userId: string;
  supabase: SupabaseClient<any>;
}

// 1. Google Gemini (NanoBanana)
// 2026-10-18: 호출·대기·이미지 받기는 공용 기준 코드 gemini-image-client(./geminiImage — 기준은 ai-image-studio),
// 등급별 모델·화질·온도는 공용 목록 gemini-image-models(./nanoBananaModels)에서 가져온다 — 같은 프로그램의 generator.ts와 같은 대응
// (예전엔 이 파일만 모든 등급을 gemini-nano-banana-2.1로 보내 1K·Pro가 generator.ts와 달랐음). 키는 주소 대신 머리글로 보낸다.
// 서버 액션 기본 한도 300초 → 시간 제한 240초, 유료 생성이라 재시도 없음(이중 과금 방지). 프롬프트·한국인 지시문·비율(1:1)은 그대로.
async function generateWithGemini(prompt: string, model: string, apiKey: string): Promise<{ buffer: Buffer; contentType: string; ext: string }> {
  const config = getNanoBananaConfig((model || "nanobanana-2-2k") as NanoBananaModelType);
  const composedPrompt = `${prompt}

${KOREAN_DEFAULT_PEOPLE_INSTRUCTION}`;

  const image = await generateGeminiImage({
    apiKey,
    modelName: config.modelName,
    prompt: composedPrompt,
    aspectRatio: "1:1",
    imageSize: config.imageSize,
    temperature: config.temperature,
    timeoutMs: 240_000,
    retries: 0,
  });

  const mimeType = image.mimeType || "image/png";
  const ext = mimeType.includes("jpeg") || mimeType.includes("jpg") ? "jpg" : "png";
  return { buffer: Buffer.from(image.base64, "base64"), contentType: mimeType, ext };
}

// 2. OpenAI (GPT Image / DALL-E)
async function generateWithOpenAI(prompt: string, model: string, apiKey: string): Promise<{ buffer: Buffer; contentType: string; ext: string }> {
  const openai = new OpenAI({ apiKey });
  const composedPrompt = `${prompt}\n\n${KOREAN_DEFAULT_PEOPLE_INSTRUCTION}`;

  const response = await openai.images.generate({
    model: model || "gpt-image-2",
    prompt: composedPrompt,
    n: 1,
    size: "1024x1024",
    response_format: "url",
  });

  const rawUrl = response.data?.[0]?.url;
  if (!rawUrl) {
    throw new Error(`OpenAI (${model}) 이미지 URL을 받지 못했습니다.`);
  }

  // 다운로드하여 버퍼로 변환
  const fetchRes = await fetch(rawUrl, { signal: AbortSignal.timeout(20000) });
  if (!fetchRes.ok) {
    throw new Error(`OpenAI 이미지 다운로드 실패 (${fetchRes.status})`);
  }
  const arrayBuffer = await fetchRes.arrayBuffer();
  const contentType = fetchRes.headers.get("content-type") || "image/png";
  const ext = contentType.includes("jpeg") || contentType.includes("jpg") ? "jpg" : "png";

  return { buffer: Buffer.from(arrayBuffer), contentType, ext };
}

// 3. Replicate (FLUX & Z-Image)
async function generateWithReplicate(
  prompt: string,
  model: string,
  apiKey: string,
  provider: "flux" | "zimage",
): Promise<{ buffer: Buffer; contentType: string; ext: string }> {
  const cleanKey = (apiKey || "").trim().replace(/^(Bearer|Token)\s+/i, "");
  if (!cleanKey) {
    throw new Error("유효한 Replicate API 키가 존재하지 않습니다. 설정 메뉴에서 API 키를 등록해주세요.");
  }
  const authHeader = `Bearer ${cleanKey}`;
  const fullModel = model || (provider === "zimage" ? "prunaai/z-image-turbo" : "black-forest-labs/flux-2-dev");
  const endpoint = `https://api.replicate.com/v1/models/${fullModel}/predictions`;

  const composedPrompt = `${prompt}\n\n${KOREAN_DEFAULT_PEOPLE_INSTRUCTION}`;
  const input: Record<string, any> = {
    prompt: composedPrompt,
    aspect_ratio: "1:1",
  };

  if (provider === "zimage") {
    input.width = 1024;
    input.height = 1024;
  } else {
    input.go_fast = true;
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
      Prefer: "wait=55",
    },
    body: JSON.stringify({ input }),
  });

  if (!res.ok) {
    const errText = await res.text();
    if (res.status === 401) {
      throw new Error("Replicate 인증 실패(401): API 키가 올바르지 않습니다. 설정에서 확인해주세요.");
    }
    throw new Error(`Replicate API 오류 (${res.status}): ${errText}`);
  }

  let prediction = await res.json();
  let rawUrl: string | null = null;

  if (prediction.status === "succeeded" && prediction.output) {
    rawUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
  } else if (prediction.status === "failed") {
    throw new Error(`Replicate 생성 실패: ${prediction.error || "알 수 없는 오류"}`);
  } else if (prediction.urls?.get) {
    // 폴링
    const pollUrl = prediction.urls.get;
    for (let i = 0; i < 25; i++) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const pollRes = await fetch(pollUrl, { headers: { Authorization: authHeader } });
      if (!pollRes.ok) continue;
      prediction = await pollRes.json();
      if (prediction.status === "succeeded" && prediction.output) {
        rawUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
        break;
      }
      if (prediction.status === "failed" || prediction.status === "canceled") {
        throw new Error(`Replicate 생성 실패 (${prediction.status}): ${prediction.error || "처리 실패"}`);
      }
    }
  }

  if (!rawUrl) {
    throw new Error("Replicate 이미지 생성 시간 초과 또는 결과 URL을 받지 못했습니다.");
  }

  const fetchRes = await fetch(rawUrl, { signal: AbortSignal.timeout(20000) });
  if (!fetchRes.ok) {
    throw new Error(`Replicate 이미지 다운로드 실패 (${fetchRes.status})`);
  }
  const arrayBuffer = await fetchRes.arrayBuffer();
  const contentType = fetchRes.headers.get("content-type") || "image/webp";
  const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";

  return { buffer: Buffer.from(arrayBuffer), contentType, ext };
}

/**
 * 4대 플랫폼(NanoBanana, GPT Image, FLUX, Z-Image) 통합 이미지 생성 함수
 * 생성된 이미지를 Supabase Storage(post-images)에 영구 보관 후 영구 Public URL 반환
 */
export async function generateMultiPlatformImage(params: GenerateImageParams): Promise<{ imageUrl: string }> {
  let imageFile: { buffer: Buffer; contentType: string; ext: string };

  switch (params.provider) {
    case "openai":
      imageFile = await generateWithOpenAI(params.prompt, params.model, params.apiKey);
      break;
    case "flux":
    case "zimage":
      imageFile = await generateWithReplicate(params.prompt, params.model, params.apiKey, params.provider);
      break;
    case "nanobanana":
    default:
      imageFile = await generateWithGemini(params.prompt, params.model, params.apiKey);
      break;
  }

  // Supabase Storage post-images에 영구 업로드
  const path = `${params.userId}/${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${imageFile.ext}`;
  const { error: uploadError } = await params.supabase.storage
    .from("post-images")
    .upload(path, imageFile.buffer, {
      contentType: imageFile.contentType,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Storage 업로드 실패: ${uploadError.message}`);
  }

  const { data } = params.supabase.storage.from("post-images").getPublicUrl(path);
  return { imageUrl: data.publicUrl };
}
