import "server-only";
import OpenAI from "openai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ImageProvider } from "./imageModels";

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
const NANO_BANANA_ENDPOINTS: Record<string, { modelName: string; endpoint: string; imageSize: "1K" | "2K" | "4K"; temperature: number }> = {
  nanobanana: {
    modelName: "gemini-2.5-flash-image",
    endpoint: "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-image:generateContent",
    imageSize: "1K",
    temperature: 0.7,
  },
  "nanobanana-2-2k": {
    modelName: "gemini-3.1-flash-image",
    endpoint: "https://generativelanguage.googleapis.com/v1/models/gemini-3.1-flash-image:generateContent",
    imageSize: "2K",
    temperature: 0.7,
  },
  "nanobanana-2-4k": {
    modelName: "gemini-3.1-flash-image",
    endpoint: "https://generativelanguage.googleapis.com/v1/models/gemini-3.1-flash-image:generateContent",
    imageSize: "4K",
    temperature: 0.7,
  },
  "nanobanana-pro": {
    modelName: "gemini-3.1-flash-image",
    endpoint: "https://generativelanguage.googleapis.com/v1/models/gemini-3.1-flash-image:generateContent",
    imageSize: "4K",
    temperature: 0.4,
  },
};

async function generateWithGemini(prompt: string, model: string, apiKey: string): Promise<{ buffer: Buffer; contentType: string; ext: string }> {
  const config = NANO_BANANA_ENDPOINTS[model] || NANO_BANANA_ENDPOINTS["nanobanana-2-2k"];
  const targetUrl = `${config.endpoint}?key=${apiKey}`;
  const composedPrompt = `${prompt}\n\n${KOREAN_DEFAULT_PEOPLE_INSTRUCTION}`;

  const requestBody = {
    contents: [{ parts: [{ text: composedPrompt }] }],
    generationConfig: {
      responseModalities: ["Image"],
      imageConfig: {
        aspectRatio: "1:1",
        imageSize: config.imageSize,
      },
      temperature: config.temperature,
    },
  };

  const response = await fetch(targetUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`NanoBanana 이미지 생성 실패 (${response.status}): ${errorBody}`);
  }

  const data = (await response.json()) as {
    candidates?: {
      content?: {
        parts?: { inlineData?: { mimeType?: string; data?: string } }[];
      };
    }[];
  };

  const imagePart = data.candidates?.[0]?.content?.parts?.find((part) => part.inlineData?.data);
  const base64 = imagePart?.inlineData?.data?.replace(/\s+/g, "");
  const mimeType = imagePart?.inlineData?.mimeType ?? "image/png";

  if (!base64) {
    throw new Error(`NanoBanana(${config.modelName})가 이미지를 반환하지 않았습니다.`);
  }

  const ext = mimeType.includes("jpeg") || mimeType.includes("jpg") ? "jpg" : "png";
  return { buffer: Buffer.from(base64, "base64"), contentType: mimeType, ext };
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
