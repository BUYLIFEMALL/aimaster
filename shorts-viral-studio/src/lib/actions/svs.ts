"use server";

import { requireProgramAccess } from "@/lib/access";
import { resolveApiKey } from "@/lib/apiKeys";
import { AI_MODEL_OPTIONS, PROVIDER_SHORT_LABELS, type AIModelProvider } from "@/lib/ai/models";
import type { LlmConfig } from "@/lib/ai/llm";
import {
  analyzeVideosAI,
  generatePromptsAI,
  generateScriptAI,
  ideateAI,
} from "@/lib/ai/pipeline";
import { YouTubeApiError, fetchDescriptions, fetchTopComments, searchShorts } from "@/lib/youtube/api";
import type {
  ActionResult,
  AnalysisResult,
  Idea,
  ModelConfig,
  PromptsResult,
  Scene,
  ScriptConfig,
  SearchParams,
  ShortVideo,
  VisualStyle,
} from "@/types/svs";

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const MAX_ANALYZE_VIDEOS = 3;

function modelLabelOf(config: ModelConfig): string {
  return AI_MODEL_OPTIONS.find((m) => m.value === config.model)?.shortLabel ?? config.model;
}

async function resolveLlm(
  userId: string,
  modelConfig: ModelConfig,
): Promise<{ ok: true; config: LlmConfig } | { ok: false; result: ActionResult<never> }> {
  const known = AI_MODEL_OPTIONS.find((m) => m.provider === modelConfig.provider && m.value === modelConfig.model);
  if (!known) {
    return { ok: false, result: { success: false, error: "지원하지 않는 모델입니다. 모델을 다시 선택해 주세요." } };
  }
  const apiKey = await resolveApiKey(userId, modelConfig.provider);
  if (!apiKey) {
    return {
      ok: false,
      result: {
        success: false,
        needApiKey: true,
        missingProvider: modelConfig.provider,
        error: `선택하신 ${PROVIDER_SHORT_LABELS[modelConfig.provider as AIModelProvider]} API 키가 등록되어 있지 않습니다. API키등록·플랫폼연동에서 본인 키를 등록해 주세요.`,
      },
    };
  }
  return { ok: true, config: { provider: modelConfig.provider, apiKey, model: modelConfig.model } };
}

function fail(err: unknown, fallback: string): ActionResult<never> {
  return { success: false, error: err instanceof Error ? err.message : fallback };
}

/** 1단계: 유튜브 쇼츠 검색 (조회수·구독자 실측값 + 떡상 지표 계산) */
export async function searchShortsAction(params: SearchParams): Promise<ActionResult<ShortVideo[]>> {
  try {
    const user = await requireProgramAccess();
    const query = params.query?.trim();
    if (!query) return { success: false, error: "검색어를 입력해 주세요." };
    if (query.length > 100) return { success: false, error: "검색어는 100자 이내로 입력해 주세요." };
    if (!["relevance", "viewCount", "date"].includes(params.order)) {
      return { success: false, error: "정렬 기준이 올바르지 않습니다." };
    }

    const apiKey = await resolveApiKey(user.id, "youtube_api_key");
    if (!apiKey) {
      return {
        success: false,
        needApiKey: true,
        missingProvider: "youtube_api_key",
        error: "YouTube Data API 키가 등록되어 있지 않습니다. API키등록·플랫폼연동에서 본인 키를 등록해 주세요.",
      };
    }

    const videos = await searchShorts({ ...params, query }, apiKey);
    return { success: true, data: videos };
  } catch (err) {
    if (err instanceof YouTubeApiError) {
      return {
        success: false,
        error: err.message,
        needApiKey: err.kind === "invalid_key",
        missingProvider: err.kind === "invalid_key" ? "youtube_api_key" : undefined,
      };
    }
    return fail(err, "유튜브 검색 중 오류가 발생했습니다.");
  }
}

/** 2단계: 선택한 쇼츠(최대 3개) 분석 */
export async function analyzeVideosAction(
  videos: ShortVideo[],
  modelConfig: ModelConfig,
): Promise<ActionResult<AnalysisResult>> {
  try {
    const user = await requireProgramAccess();
    const targets = (videos ?? []).filter((v) => VIDEO_ID.test(v?.id ?? "")).slice(0, MAX_ANALYZE_VIDEOS);
    if (targets.length === 0) return { success: false, error: "분석할 영상을 1개 이상 선택해 주세요." };

    const llm = await resolveLlm(user.id, modelConfig);
    if (!llm.ok) return llm.result;

    // 댓글·설명은 보조 근거 — 유튜브 키가 있을 때만 가져옵니다.
    const ytKey = await resolveApiKey(user.id, "youtube_api_key");
    const ids = targets.map((v) => v.id);
    const comments: Record<string, string[]> = {};
    let descriptions: Record<string, string> = {};
    if (ytKey) {
      await Promise.all(
        ids.map(async (id) => {
          comments[id] = await fetchTopComments(id, ytKey);
        }),
      );
      descriptions = await fetchDescriptions(ids, ytKey);
    }

    const analysis = await analyzeVideosAI({
      videos: targets,
      comments,
      descriptions,
      config: llm.config,
      modelLabel: modelLabelOf(modelConfig),
    });
    return { success: true, data: analysis };
  } catch (err) {
    return fail(err, "영상 분석 중 오류가 발생했습니다.");
  }
}

/** 3단계: 소재 6개 발굴 */
export async function ideateAction(
  keyword: string,
  analysis: AnalysisResult,
  modelConfig: ModelConfig,
): Promise<ActionResult<Idea[]>> {
  try {
    const user = await requireProgramAccess();
    if (!analysis?.contentDNA) return { success: false, error: "먼저 영상 분석을 진행해 주세요." };
    const llm = await resolveLlm(user.id, modelConfig);
    if (!llm.ok) return llm.result;
    const ideas = await ideateAI({ keyword: (keyword ?? "").slice(0, 100), analysis, config: llm.config });
    return { success: true, data: ideas };
  } catch (err) {
    return fail(err, "소재 발굴 중 오류가 발생했습니다.");
  }
}

/** 5단계: 대본 생성 / 피드백 반영 재생성 */
export async function generateScriptAction(input: {
  idea: Idea;
  topicFeedback: string;
  visualStyle: VisualStyle | null;
  scriptConfig: ScriptConfig;
  revisionFeedback?: string;
  previousScenes?: Scene[];
  modelConfig: ModelConfig;
}): Promise<ActionResult<Scene[]>> {
  try {
    const user = await requireProgramAccess();
    if (!input.idea?.title) return { success: false, error: "먼저 소재를 선택해 주세요." };
    const llm = await resolveLlm(user.id, input.modelConfig);
    if (!llm.ok) return llm.result;
    const scenes = await generateScriptAI({
      idea: input.idea,
      topicFeedback: (input.topicFeedback ?? "").slice(0, 1000),
      visualStyle: input.visualStyle,
      scriptConfig: {
        durationSec: Number(input.scriptConfig?.durationSec) || 60,
        tone: (input.scriptConfig?.tone ?? "").slice(0, 100),
        target: (input.scriptConfig?.target ?? "").slice(0, 100),
      },
      revisionFeedback: input.revisionFeedback?.slice(0, 1000),
      previousScenes: input.previousScenes,
      config: llm.config,
    });
    return { success: true, data: scenes };
  } catch (err) {
    return fail(err, "대본 생성 중 오류가 발생했습니다.");
  }
}

/** 6단계: 씬별 이미지·영상 프롬프트 + BGM 프롬프트 */
export async function generatePromptsAction(input: {
  idea: Idea;
  scenes: Scene[];
  visualStyle: VisualStyle | null;
  modelConfig: ModelConfig;
}): Promise<ActionResult<PromptsResult>> {
  try {
    const user = await requireProgramAccess();
    if (!input.scenes?.length) return { success: false, error: "먼저 대본을 생성해 주세요." };
    const llm = await resolveLlm(user.id, input.modelConfig);
    if (!llm.ok) return llm.result;
    const result = await generatePromptsAI({
      idea: input.idea,
      scenes: input.scenes,
      visualStyle: input.visualStyle,
      config: llm.config,
    });
    return { success: true, data: result };
  } catch (err) {
    return fail(err, "프롬프트 생성 중 오류가 발생했습니다.");
  }
}
