import { NextRequest, NextResponse } from "next/server";
import { checkProgramAccessApi, logProgramUsage } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/apiKeys";
import type { ApiKeyProvider } from "@/types/database.types";

export const maxDuration = 60;
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type Platform = "nanobanana" | "replicate" | "gpt-image-1";

interface GenerateImageRequest {
  platform: Platform;
  prompt: string;
  aspectRatio: string;
}

// 각 이미지 생성 플랫폼이 실제로 쓰는 API 키 provider. nanobanana(Gemini)는 이미
// 다른 프로그램들이 쓰는 "gemini" provider를, gpt-image-1(OpenAI)은 "openai"
// provider를 그대로 재사용한다.
const PLATFORM_PROVIDER: Record<Platform, ApiKeyProvider> = {
  nanobanana: "gemini",
  "gpt-image-1": "openai",
  replicate: "replicate",
};

// 사용자가 프롬프트를 직접 입력하는 화면이라 별도 시스템 템플릿이 없다. 실제 API
// 호출 직전에 이 지시문을 덧붙여 인물 묘사 기본값을 강제 적용한다.
const KOREAN_DEFAULT_PEOPLE_INSTRUCTION =
  "\n\nIf this scene includes any human figures, depict them as Korean/East Asian people by default. Only depict a different ethnicity/nationality if the prompt above explicitly names a specific foreign celebrity, politician, entertainer, or athlete, or explicitly describes a foreign country/setting.";

/* ── 나노바나나 (Gemini 2.5 Flash Image) ── */
async function generateWithNanobanana(
  prompt: string,
  aspectRatio: string,
  apiKey: string
) {
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.8,
          imageConfig: { aspectRatio },
          responseModalities: ["Image"],
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API 오류: ${err}`);
  }

  const data = await res.json();
  const part = data.candidates?.[0]?.content?.parts?.[0];

  if (!part?.inlineData) {
    throw new Error("Gemini로부터 이미지 데이터를 받지 못했습니다.");
  }

  return {
    base64: part.inlineData.data as string,
    mediaType: (part.inlineData.mimeType || "image/png") as string,
  };
}

/* ── Replicate (FLUX 2 Dev) ── */
async function generateWithReplicate(
  prompt: string,
  aspectRatio: string,
  apiKey: string
) {
  // 1. 예측 생성
  const createRes = await fetch(
    "https://api.replicate.com/v1/models/black-forest-labs/flux-2-dev/predictions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: {
          prompt,
          go_fast: true,
          aspect_ratio: aspectRatio,
          input_images: [],
          output_format: "jpg",
          output_quality: 80,
        },
      }),
    }
  );

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Replicate API 오류: ${err}`);
  }

  const prediction = await createRes.json();
  const pollUrl = prediction.urls?.get;
  if (!pollUrl) throw new Error("Replicate prediction URL을 받지 못했습니다.");

  // 2. 결과 폴링 (최대 50초)
  for (let i = 0; i < 25; i++) {
    await new Promise((r) => setTimeout(r, 2000));

    const pollRes = await fetch(pollUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const result = await pollRes.json();

    if (result.status === "succeeded" && result.output?.[0]) {
      const imgRes = await fetch(result.output[0]);
      const buffer = await imgRes.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      return { base64, mediaType: "image/jpeg" };
    }

    if (result.status === "failed") {
      throw new Error(`Replicate 생성 실패: ${result.error}`);
    }
  }

  throw new Error("Replicate 이미지 생성 타임아웃 (50초 초과)");
}

/* ── GPT Image 1 (OpenAI) ── */
async function generateWithGptImage1(
  prompt: string,
  aspectRatio: string,
  apiKey: string
) {
  const sizeMap: Record<string, string> = {
    "1:1": "1024x1024",
    "4:3": "1536x1024",
    "16:9": "1536x1024",
    "3:4": "1024x1536",
    "9:16": "1024x1536",
  };
  const size = sizeMap[aspectRatio] || "1024x1024";

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt,
      n: 1,
      size,
      response_format: "b64_json",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API 오류: ${err}`);
  }

  const data = await res.json();
  const base64 = data.data?.[0]?.b64_json;

  if (!base64) throw new Error("OpenAI로부터 이미지 데이터를 받지 못했습니다.");

  return { base64, mediaType: "image/png" };
}

/* ── 메인 핸들러 ── */
export async function POST(request: NextRequest) {
  try {
    const access = await checkProgramAccessApi();
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const { user } = access;

    const { platform, prompt, aspectRatio }: GenerateImageRequest = await request.json();

    if (!prompt?.trim()) {
      return NextResponse.json(
        { error: "프롬프트를 입력해주세요." },
        { status: 400 }
      );
    }

    const provider = PLATFORM_PROVIDER[platform];
    if (!provider) {
      return NextResponse.json(
        { error: "지원하지 않는 플랫폼입니다." },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const apiKey = await resolveApiKey(supabase, user.id, provider);
    if (!apiKey) {
      return NextResponse.json(
        { error: `이 플랫폼에 필요한 API 키가 없습니다. 설정 페이지에서 본인 키를 등록해주세요.` },
        { status: 400 },
      );
    }

    const composedPrompt = prompt + KOREAN_DEFAULT_PEOPLE_INSTRUCTION;
    let result: { base64: string; mediaType: string };

    switch (platform) {
      case "nanobanana":
        result = await generateWithNanobanana(composedPrompt, aspectRatio, apiKey);
        break;
      case "replicate":
        result = await generateWithReplicate(composedPrompt, aspectRatio, apiKey);
        break;
      case "gpt-image-1":
        result = await generateWithGptImage1(composedPrompt, aspectRatio, apiKey);
        break;
    }

    await logProgramUsage({
      userId: user.id,
      action: "generate_image",
      metadata: { platform },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Image generation error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
