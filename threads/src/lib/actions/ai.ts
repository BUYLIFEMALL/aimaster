"use server";

import { requireUser } from "@/lib/auth";
import { generatePostContent, type GeneratePostInput } from "@/lib/ai/generator";
import { logProgramUsage } from "@/lib/access";

export interface GenerateContentState {
  content?: string;
  error?: string;
}

export async function generateContentAction(
  input: GeneratePostInput,
): Promise<GenerateContentState> {
  const user = await requireUser();

  if (!input.topic.trim()) {
    return { error: "주제를 입력해주세요." };
  }

  try {
    const result = await generatePostContent(input);
    await logProgramUsage({
      userId: user.id,
      action: "ai_generate_post",
      metadata: { topic: input.topic, tone: input.tone },
    });
    return { content: result.content };
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI 생성에 실패했습니다.";
    return { error: message };
  }
}
