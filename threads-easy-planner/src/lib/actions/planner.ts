"use server";

import { requireProgramAccess } from "@/lib/access";
import { resolveApiKey, resolveAvailableAI } from "@/lib/apiKeys";
import {
  suggestTopicsAI,
  generateThreadPlanAI,
  rewriteThreadPlanAI,
  type TopicSuggestion,
  type ThreadPlanResult,
  type RewriteMode,
} from "@/lib/ai/generator";
import { TARGET_CATEGORIES } from "@/lib/constants/categories";
import { PROVIDER_SHORT_LABELS, type AIModelProvider } from "@/lib/ai/models";

export interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  needApiKey?: boolean;
  missingProvider?: AIModelProvider;
}

export interface ModelConfigParam {
  provider: AIModelProvider;
  model: string;
}

async function resolveAIConfig(
  userId: string,
  modelConfig?: ModelConfigParam
): Promise<
  | { success: true; config: { provider: AIModelProvider; apiKey: string; model?: string } }
  | { success: false; needApiKey: true; missingProvider?: AIModelProvider; error: string }
> {
  if (modelConfig?.provider) {
    const key = await resolveApiKey(userId, modelConfig.provider);
    if (!key) {
      return {
        success: false,
        needApiKey: true,
        missingProvider: modelConfig.provider,
        error: `선택하신 ${PROVIDER_SHORT_LABELS[modelConfig.provider] || modelConfig.provider} API 키가 등록되어 있지 않습니다. 우측 상단 API키 설정에서 본인 키를 등록해주세요.`,
      };
    }
    return {
      success: true,
      config: { provider: modelConfig.provider, apiKey: key, model: modelConfig.model },
    };
  }

  const fallback = await resolveAvailableAI(userId);
  if (!fallback) {
    return {
      success: false,
      needApiKey: true,
      error: "AI API 키(OpenAI, Gemini 또는 Claude)가 등록되어 있지 않습니다. 우측 상단 API키 설정에서 본인 키를 등록해주세요.",
    };
  }
  return { success: true, config: fallback };
}

/**
 * 1. "오늘 뭐 쓰지?" 주제 10개 추천
 */
export async function getSuggestedTopicsAction(
  categoryId?: string,
  customKeyword?: string,
  modelConfig?: ModelConfigParam
): Promise<ActionResult<TopicSuggestion[]>> {
  try {
    const user = await requireProgramAccess();
    const resolved = await resolveAIConfig(user.id, modelConfig);

    if (!resolved.success) {
      return {
        success: false,
        needApiKey: true,
        missingProvider: resolved.missingProvider,
        error: resolved.error,
      };
    }

    const category = TARGET_CATEGORIES.find((c) => c.id === categoryId);
    const categoryName = category ? `${category.emoji} ${category.name} (${category.description})` : undefined;

    const topics = await suggestTopicsAI({
      categoryName,
      customKeyword,
      aiConfig: resolved.config,
    });

    return { success: true, data: topics };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "주제 추천 생성 중 오류가 발생했습니다.";
    return { success: false, error: msg };
  }
}

import { PLANNER_PERSONAS } from "@/types/planner";

/**
 * 2. 선택한 주제로 5단 구성 스레드 글 생성 (페르소나 연동 지원)
 */
export async function generateThreadPlanAction(
  topic: string,
  additionalNote?: string,
  modelConfig?: ModelConfigParam,
  templateInput?: import("@/types/planner").ThreadPlannerTemplateInput,
  personaId?: string,
  mediaData?: import("@/types/planner").MediaPayload
): Promise<ActionResult<ThreadPlanResult>> {
  try {
    const user = await requireProgramAccess();
    const resolved = await resolveAIConfig(user.id, modelConfig);

    if (!resolved.success) {
      return {
        success: false,
        needApiKey: true,
        missingProvider: resolved.missingProvider,
        error: resolved.error,
      };
    }

    const effectiveTopic =
      topic.trim() ||
      templateInput?.product ||
      templateInput?.experience ||
      (mediaData
        ? `${mediaData.type === "video" ? "동영상 현장 디테일 및 리얼 썰" : "제품 실사용 디테일 및 리얼 후기 썰"}`
        : "스레드 바이럴 글");

    // 페르소나 프롬프트 해결
    let personaPrompt: string | undefined = undefined;
    if (personaId) {
      const p = PLANNER_PERSONAS.find((item) => item.id === personaId);
      if (p) {
        personaPrompt = `[페르소나: ${p.name} (${p.badge})]\n${p.tonePrompt}\n특징: ${p.description}`;
      }
    }

    const plan = await generateThreadPlanAI({
      topic: effectiveTopic,
      additionalNote: additionalNote?.trim(),
      templateInput,
      personaPrompt,
      mediaData,
      aiConfig: resolved.config,
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
  modelConfig?: ModelConfigParam
): Promise<ActionResult<ThreadPlanResult>> {
  try {
    const user = await requireProgramAccess();
    const resolved = await resolveAIConfig(user.id, modelConfig);

    if (!resolved.success) {
      return {
        success: false,
        needApiKey: true,
        missingProvider: resolved.missingProvider,
        error: resolved.error,
      };
    }

    const updatedPlan = await rewriteThreadPlanAI({
      currentPlan,
      mode,
      aiConfig: resolved.config,
    });

    return { success: true, data: updatedPlan };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "다시 쓰기 중 오류가 발생했습니다.";
    return { success: false, error: msg };
  }
}
