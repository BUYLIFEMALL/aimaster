"use server";

import { generateCafePostContent, reviseCafePostContent } from "@/lib/ai/cafeGenerator";
import type { CafeTone } from "@/lib/ai/tone";
import { generatePostImage, type NanoBananaModelType } from "@/lib/ai/imageGenerator";
import { requireProgramAccess, logProgramUsage } from "@/lib/access";
import { resolveApiKey } from "@/lib/apiKeys";
import { createClient } from "@/lib/supabase/server";

export interface GenerateContentState {
  title?: string;
  content?: string;
  error?: string;
}

export interface GenerateImageState {
  imageUrl?: string;
  error?: string;
}

export interface GenerateCafePostInput {
  topic: string;
  tone?: CafeTone;
  targetAudience?: string;
  wordCount?: number;
  keywords?: string[];
  referenceUrls?: string[];
  customInstructions?: string;
  cta?: { text: string; url: string };
}

export async function generateCafePostAction(input: GenerateCafePostInput): Promise<GenerateContentState> {
  const user = await requireProgramAccess();

  if (!input.topic.trim()) {
    return { error: "글감(주제)을 입력해주세요." };
  }

  try {
    const supabase = await createClient();
    const apiKey = await resolveApiKey(supabase, user.id, "openai");
    if (!apiKey) {
      return { error: "OpenAI API 키가 없습니다. 설정 페이지에서 본인 키를 등록해주세요." };
    }

    const result = await generateCafePostContent(input, apiKey);

    await logProgramUsage({ userId: user.id, action: "ai_generate_cafe_post" });

    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI 생성에 실패했습니다.";
    return { error: message };
  }
}

/** 이미 생성/저장된 초안을 자연어 지시로 다시 고쳐 쓴다("생성"과 별개인 "수정 요청"). */
export async function reviseCafePostAction(input: {
  title: string;
  content: string;
  instruction: string;
}): Promise<GenerateContentState> {
  const user = await requireProgramAccess();

  if (!input.instruction.trim()) {
    return { error: "수정 지시사항을 입력해주세요." };
  }

  try {
    const supabase = await createClient();
    const apiKey = await resolveApiKey(supabase, user.id, "openai");
    if (!apiKey) {
      return { error: "OpenAI API 키가 없습니다. 설정 페이지에서 본인 키를 등록해주세요." };
    }

    const result = await reviseCafePostContent(input, apiKey);

    await logProgramUsage({ userId: user.id, action: "ai_revise_cafe_post" });

    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI 수정에 실패했습니다.";
    return { error: message };
  }
}

/** 나노바나나(Gemini) 대표 이미지 생성 — blog(BLOG(원문)생성 자동화) AI 글쓰기 폼과 동일 기능. */
export async function generateCafeImageAction(input: {
  prompt: string;
  apiKey?: string;
  model?: NanoBananaModelType;
  endpoint?: string;
}): Promise<GenerateImageState> {
  const user = await requireProgramAccess();

  if (!input.prompt.trim()) {
    return { error: "이미지 프롬프트를 입력해주세요." };
  }

  try {
    const supabase = await createClient();
    const apiKey = input.apiKey?.trim() || (await resolveApiKey(supabase, user.id, "gemini"));
    if (!apiKey) {
      return { error: "Gemini API 키가 없습니다. 설정 페이지에서 본인 키를 등록해주세요." };
    }

    const result = await generatePostImage(
      { prompt: input.prompt, model: input.model, endpoint: input.endpoint },
      apiKey,
    );
    const ext = result.mimeType.split("/")[1] ?? "png";
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("post-images")
      .upload(path, Buffer.from(result.base64, "base64"), { contentType: result.mimeType, upsert: false });
    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = supabase.storage.from("post-images").getPublicUrl(path);

    await logProgramUsage({ userId: user.id, action: "ai_generate_cafe_image" });

    return { imageUrl: data.publicUrl };
  } catch (err) {
    const message = err instanceof Error ? err.message : "이미지 생성에 실패했습니다.";
    return { error: message };
  }
}
