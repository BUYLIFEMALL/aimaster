"use server";

// 글과 함께 만드는 이미지(2026-10-23 v1.48). ① 글로 이미지 프롬프트 만들기 ② 프롬프트 1개로 이미지 1장 생성·저장 — 화면이 장마다 따로 불러 한 요청이 300초를 넘지 않게 한다.
// 키는 회원 본인 것만(최상위 규칙): 프롬프트 = 화면에서 고른 글 AI 키, 이미지 = 나노바나나→Gemini 키 / GPT Image→OpenAI 키.
import { requireProgramAccess } from "@/lib/access";
import { resolveApiKey, resolveAvailableAI, type AIProvider } from "@/lib/apiKeys";
import { createAdminClient } from "@/lib/supabase/admin";
import { planImagePromptsAI } from "@/lib/ai/generator";
import { generateImageBytes } from "@/lib/ai/postImage";
import { IMAGE_ENGINE_LABELS, findImageModel, isImageRatio, MAX_IMAGE_COUNT } from "@/lib/ai/imageModels";
import { IMAGE_BUCKET } from "@/lib/storage/imageBucket";
import { IMAGE_FEATURE } from "@/lib/deployment";

const IMAGE_OFF = "이 사이트에서는 이미지 만들기를 쓰지 않습니다.";

export interface ImageActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  needApiKey?: boolean;
  missingProvider?: AIProvider;
}

export async function planImagePromptsAction(input: {
  topic: string;
  hook: string;
  content: string;
  count: number;
  textModel?: { provider: AIProvider; model: string };
}): Promise<ImageActionResult<string[]>> {
  try {
    const user = await requireProgramAccess();
    if (!IMAGE_FEATURE) return { success: false, error: IMAGE_OFF };
    const content = String(input.content ?? "").trim().slice(0, 4_000);
    if (!content) return { success: false, error: "이미지로 만들 글이 없습니다. 먼저 글을 생성해 주세요." };

    let aiConfig: { provider: AIProvider; apiKey: string; model?: string } | null = null;
    if (input.textModel?.provider) {
      const key = await resolveApiKey(user.id, input.textModel.provider);
      if (key) aiConfig = { provider: input.textModel.provider, apiKey: key, model: input.textModel.model };
    }
    if (!aiConfig) aiConfig = await resolveAvailableAI(user.id);
    if (!aiConfig) return { success: false, needApiKey: true, error: "AI API 키(OpenAI, Gemini 또는 Claude)가 등록되어 있지 않습니다. API키 등록·관리에서 본인 키를 등록해주세요." };

    const prompts = await planImagePromptsAI({
      topic: String(input.topic ?? "").slice(0, 300),
      hook: String(input.hook ?? "").slice(0, 500),
      content,
      count: Math.min(Math.max(Number(input.count) || 1, 1), MAX_IMAGE_COUNT),
      aiConfig,
    });
    if (prompts.length === 0) return { success: false, error: "이미지 프롬프트를 만들지 못했습니다. 다시 시도해 주세요." };
    return { success: true, data: prompts };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "이미지 프롬프트를 만들지 못했습니다." };
  }
}

export async function generatePlanImageAction(input: {
  prompt: string;
  model: string;
  ratio: string;
}): Promise<ImageActionResult<{ url: string }>> {
  try {
    const user = await requireProgramAccess();
    if (!IMAGE_FEATURE) return { success: false, error: IMAGE_OFF };
    const prompt = String(input.prompt ?? "").trim();
    if (!prompt) return { success: false, error: "이미지 프롬프트가 비어 있습니다." };
    if (prompt.length > 1_500) return { success: false, error: "이미지 프롬프트는 1,500자 이하로 줄여 주세요." };
    const model = findImageModel(String(input.model ?? ""));
    if (!model) return { success: false, error: "지원하지 않는 이미지 모델입니다." };
    const ratio = String(input.ratio ?? "");
    if (!isImageRatio(ratio)) return { success: false, error: "지원하지 않는 이미지 비율입니다." };

    const apiKey = await resolveApiKey(user.id, model.engine);
    if (!apiKey) {
      return {
        success: false,
        needApiKey: true,
        missingProvider: model.engine,
        error: `${IMAGE_ENGINE_LABELS[model.engine]} 이미지를 만들려면 ${model.engine === "gemini" ? "Gemini" : "OpenAI"} API 키가 필요합니다. API키 등록·관리에서 본인 키를 등록하거나 다른 이미지 모델을 골라 주세요.`,
      };
    }

    const image = await generateImageBytes({ model: model.value, ratio, prompt, apiKey });
    if (image.bytes.length > 12_000_000) throw new Error("생성된 이미지가 너무 큽니다. 다른 모델이나 비율로 다시 시도해 주세요.");
    const extension = image.mime.includes("jpeg") ? "jpg" : image.mime.includes("webp") ? "webp" : "png";
    // 회원 폴더(<회원 id>/…)에만 저장 — 30일 지나면 보관함 목록을 열 때 자동 삭제(savedPlans.ts)
    const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
    const admin = createAdminClient();
    const { error } = await admin.storage.from(IMAGE_BUCKET).upload(path, image.bytes, { contentType: image.mime, upsert: false });
    if (error) throw new Error("생성한 이미지를 저장하지 못했습니다. (설치 DB에 이미지 저장 공간이 없으면 KIT/upgrade-20261023-images.sql 실행) 잠시 뒤 다시 시도해 주세요.");
    return { success: true, data: { url: admin.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "이미지를 만들지 못했습니다." };
  }
}
