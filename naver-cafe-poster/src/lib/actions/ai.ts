"use server";

import { generateCafePostContent } from "@/lib/ai/cafeGenerator";
import type { CafeTone } from "@/lib/ai/tone";
import { requireProgramAccess, logProgramUsage } from "@/lib/access";
import { resolveApiKey } from "@/lib/apiKeys";
import { createClient } from "@/lib/supabase/server";

export interface GenerateContentState {
  title?: string;
  content?: string;
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
