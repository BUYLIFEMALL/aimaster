"use server";

import { createClient } from "@/lib/supabase/server";
import {
  generatePostContent,
  generatePostImage,
  generateCardNewsContent,
  generateCardNewsCaption,
  generateVisualPrompts,
  type GeneratePostInput,
  type ImageAspectRatio,
  type NanoBananaModelType,
  type VisualPromptSlide,
} from "@/lib/ai/generator";
import { logProgramUsage, requireProgramAccess } from "@/lib/access";
import { resolveApiKey } from "@/lib/apiKeys";

export interface GenerateContentState {
  caption?: string;
  hashtags?: string[];
  error?: string;
}

export interface GenerateCardNewsContentState {
  title?: string;
  content?: string;
  hashtags?: string[];
  error?: string;
}

export interface GenerateVisualPromptsState {
  slides?: VisualPromptSlide[];
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
    return { caption: result.caption, hashtags: result.hashtags };
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI 생성에 실패했습니다.";
    return { error: message };
  }
}

export async function generateImageAction(input: {
  prompt: string;
  apiKey?: string;
  model?: NanoBananaModelType;
  aspectRatio?: ImageAspectRatio;
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
      { prompt: input.prompt, model: input.model, aspectRatio: input.aspectRatio },
      apiKey,
    );
    const ext = result.mimeType.split("/")[1] ?? "png";
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("insta-post-images")
      .upload(path, Buffer.from(result.base64, "base64"), {
        contentType: result.mimeType,
        upsert: false,
      });
    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = supabase.storage.from("insta-post-images").getPublicUrl(path);

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

/** 카드뉴스 소스 원고(장문 본문+title+hashtags)를 생성한다. */
export async function generateCardNewsContentAction(input: {
  topic: string;
  keywords?: string[];
  referenceUrls?: string[];
  apiKey?: string;
}): Promise<GenerateCardNewsContentState> {
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

    const result = await generateCardNewsContent(input, apiKey);
    await logProgramUsage({
      userId: user.id,
      action: "ai_generate_card_news_content",
      metadata: { topic: input.topic },
    });
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : "카드뉴스 원고 생성에 실패했습니다.";
    return { error: message };
  }
}

/** 카드뉴스 장문 원고를 900~1400자, 6~7문단짜리 인스타그램 캡션으로 재가공한다. */
export async function generateCardNewsCaptionAction(input: {
  title: string;
  content: string;
  apiKey?: string;
}): Promise<GenerateContentState> {
  const user = await requireProgramAccess();

  if (!input.content.trim()) {
    return { error: "원본 콘텐츠가 없습니다." };
  }

  try {
    const supabase = await createClient();
    const apiKey = input.apiKey?.trim() || (await resolveApiKey(supabase, user.id, "openai"));
    if (!apiKey) {
      return { error: "OpenAI API 키가 없습니다. 설정 페이지에서 본인 키를 등록해주세요." };
    }

    const result = await generateCardNewsCaption(input, apiKey);
    await logProgramUsage({
      userId: user.id,
      action: "ai_generate_card_news_caption",
      metadata: { title: input.title },
    });
    return { caption: result.caption, hashtags: result.hashtags };
  } catch (err) {
    const message = err instanceof Error ? err.message : "카드뉴스 캡션 생성에 실패했습니다.";
    return { error: message };
  }
}

/** 장문 텍스트를 slideCount개 문단으로 나눠 슬라이드별 이미지 프롬프트를 생성한다. */
export async function generateVisualPromptsAction(input: {
  text: string;
  slideCount: number;
  apiKey?: string;
}): Promise<GenerateVisualPromptsState> {
  const user = await requireProgramAccess();

  if (!input.text.trim()) {
    return { error: "원본 텍스트가 없습니다." };
  }

  try {
    const supabase = await createClient();
    const apiKey = input.apiKey?.trim() || (await resolveApiKey(supabase, user.id, "openai"));
    if (!apiKey) {
      return { error: "OpenAI API 키가 없습니다. 설정 페이지에서 본인 키를 등록해주세요." };
    }

    const slides = await generateVisualPrompts(input.text, input.slideCount, apiKey);
    await logProgramUsage({
      userId: user.id,
      action: "ai_generate_visual_prompts",
      metadata: { slideCount: input.slideCount },
    });
    return { slides };
  } catch (err) {
    const message = err instanceof Error ? err.message : "이미지 프롬프트 생성에 실패했습니다.";
    return { error: message };
  }
}
