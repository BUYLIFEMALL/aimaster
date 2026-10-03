"use server";

import { requireProgramAccess } from "@/lib/access";
import { resolveAvailableAI } from "@/lib/apiKeys";
import {
  suggestTopicsAI,
  generateThreadPlanAI,
  rewriteThreadPlanAI,
  type TopicSuggestion,
  type ThreadPlanResult,
  type RewriteMode,
} from "@/lib/ai/generator";
import { TARGET_CATEGORIES } from "@/lib/constants/categories";

export interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  needApiKey?: boolean;
}

/**
 * 1. "오늘 뭐 쓰지?" 주제 10개 추천
 */
export async function getSuggestedTopicsAction(
  categoryId?: string,
  customKeyword?: string,
): Promise<ActionResult<TopicSuggestion[]>> {
  try {
    const user = await requireProgramAccess();
    const ai = await resolveAvailableAI(user.id);

    if (!ai) {
      return {
        success: false,
        needApiKey: true,
        error: "AI API 키(OpenAI, Gemini 또는 Claude)가 등록되어 있지 않습니다. 우측 상단 API키 설정에서 본인 키를 등록해주세요.",
      };
    }

    const category = TARGET_CATEGORIES.find((c) => c.id === categoryId);
    const categoryName = category ? `${category.emoji} ${category.name} (${category.description})` : undefined;

    const topics = await suggestTopicsAI({
      categoryName,
      customKeyword,
      aiConfig: { provider: ai.provider, apiKey: ai.apiKey },
    });

    return { success: true, data: topics };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "주제 추천 생성 중 오류가 발생했습니다.";
    return { success: false, error: msg };
  }
}

/**
 * 2. 선택한 주제로 5단 구성 스레드 글 생성
 */
export async function generateThreadPlanAction(
  topic: string,
  additionalNote?: string,
): Promise<ActionResult<ThreadPlanResult>> {
  try {
    const user = await requireProgramAccess();
    const ai = await resolveAvailableAI(user.id);

    if (!ai) {
      return {
        success: false,
        needApiKey: true,
        error: "AI API 키가 등록되어 있지 않습니다. API키 설정에서 등록해주세요.",
      };
    }

    if (!topic.trim()) {
      return { success: false, error: "주제를 입력하거나 추천 목록에서 선택해주세요." };
    }

    const plan = await generateThreadPlanAI({
      topic: topic.trim(),
      additionalNote: additionalNote?.trim(),
      aiConfig: { provider: ai.provider, apiKey: ai.apiKey },
    });

    return { success: true, data: plan };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "스레드 글 생성 중 오류가 발생했습니다.";
    return { success: false, error: msg };
  }
}

/**
 * 3. 7종 "다시 써줘" 원클릭 리라이팅
 */
export async function rewriteThreadPlanAction(
  currentPlan: ThreadPlanResult,
  mode: RewriteMode,
): Promise<ActionResult<ThreadPlanResult>> {
  try {
    const user = await requireProgramAccess();
    const ai = await resolveAvailableAI(user.id);

    if (!ai) {
      return {
        success: false,
        needApiKey: true,
        error: "AI API 키가 등록되어 있지 않습니다.",
      };
    }

    const updatedPlan = await rewriteThreadPlanAI({
      currentPlan,
      mode,
      aiConfig: { provider: ai.provider, apiKey: ai.apiKey },
    });

    return { success: true, data: updatedPlan };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "다시 쓰기 중 오류가 발생했습니다.";
    return { success: false, error: msg };
  }
}
