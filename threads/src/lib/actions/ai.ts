"use server";

import { createClient } from "@/lib/supabase/server";
import {
  generatePostContent,
  generatePostImage,
  type GeneratePostInput,
  type NanoBananaModelType,
} from "@/lib/ai/generator";
import { logProgramUsage, requireProgramAccess } from "@/lib/access";
import { resolveApiKey } from "@/lib/apiKeys";

export interface GenerateContentState {
  content?: string;
  error?: string;
}

export interface GenerateImageState {
  imageUrl?: string;
  error?: string;
}

export async function generateContentAction(
  input: GeneratePostInput & { apiKey?: string },
): Promise<GenerateContentState> {
  const user = await requireProgramAccess();

  if (!input.topic.trim()) {
    return { error: "주제를 입력해주세요." };
  }

  try {
    const supabase = await createClient();
    const apiKey = input.apiKey?.trim() || (await resolveApiKey(supabase, user.id, "openai"));
    if (!apiKey) {
      return { error: "OpenAI API 키가 없습니다. 설정 페이지에서 본인 키를 등록해주세요." };
    }

    const result = await generatePostContent(input, apiKey);
    await logProgramUsage({
      userId: user.id,
      action: "ai_generate_post",
      metadata: { topic: input.topic, tone: input.tone, keywords: input.keywords },
    });
    return { content: result.content };
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI 생성에 실패했습니다.";
    return { error: message };
  }
}

export async function generateImageAction(input: {
  prompt: string;
  apiKey?: string;
  model?: NanoBananaModelType;
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

    const result = await generatePostImage({ prompt: input.prompt, model: input.model }, apiKey);
    const ext = result.mimeType.split("/")[1] ?? "png";
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("post-images")
      .upload(path, Buffer.from(result.base64, "base64"), {
        contentType: result.mimeType,
        upsert: false,
      });
    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = supabase.storage.from("post-images").getPublicUrl(path);

    await logProgramUsage({
      userId: user.id,
      action: "ai_generate_image",
      metadata: { prompt: input.prompt },
    });

    return { imageUrl: data.publicUrl };
  } catch (err) {
    const message = err instanceof Error ? err.message : "이미지 생성에 실패했습니다.";
    return { error: message };
  }
}
