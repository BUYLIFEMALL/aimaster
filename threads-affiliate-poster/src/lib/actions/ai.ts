"use server";

import { createClient } from "@/lib/supabase/server";
import { generateAffiliatePostContent, getDisclosureText } from "@/lib/ai/affiliateGenerator";
import type { ThreadsTone } from "@/lib/ai/generator";
import {
  type AIModelProvider,
  DEFAULT_AI_MODELS,
  PROVIDER_SHORT_LABELS,
} from "@/lib/ai/models";
import {
  type ImageProvider,
  DEFAULT_IMAGE_MODELS,
} from "@/lib/ai/imageModels";
import { generateMultiPlatformImage } from "@/lib/ai/imageGenerator";
import { logProgramUsage, requireProgramAccess } from "@/lib/access";
import { resolveApiKey } from "@/lib/apiKeys";
import { getDetailPageExcerpt } from "@/lib/detailPages";

export interface GenerateContentState {
  content?: string;
  error?: string;
}

export interface GenerateImageState {
  imageUrl?: string;
  error?: string;
}

/**
 * 등록된 상품(affiliate_products)을 골라 제휴 링크가 포함된 캡션을 생성한다.
 * 플랫폼별 제휴 고지 문구는 generateAffiliatePostContent() 안에서 항상 자동으로
 * 붙으므로, 이 액션을 거치지 않고 다른 경로로 캡션을 만들면 안 된다.
 */
export async function generateAffiliateContentAction(input: {
  productId: string;
  tone?: ThreadsTone;
  keywords?: string[];
  referenceUrls?: string[];
  apiKey?: string;
  aiProvider?: AIModelProvider;
  aiModel?: string;
}): Promise<GenerateContentState> {
  const user = await requireProgramAccess();

  if (!input.productId) {
    return { error: "상품을 선택해주세요." };
  }

  try {
    const supabase = await createClient();

    const { data: product } = await supabase
      .from("affiliate_products")
      .select("*")
      .eq("id", input.productId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!product) {
      return { error: "선택한 상품을 찾을 수 없습니다." };
    }

    const provider: AIModelProvider = input.aiProvider || "openai";
    const model = input.aiModel || DEFAULT_AI_MODELS[provider];
    const providerLabel = PROVIDER_SHORT_LABELS[provider] || provider;

    const apiKey = input.apiKey?.trim() || (await resolveApiKey(supabase, user.id, provider));
    if (!apiKey) {
      return { error: `${providerLabel} API 키가 없습니다. 설정 페이지에서 본인 키를 등록해주세요.` };
    }

    let detailPageExcerpt: string | null = null;
    if (product.input_mode === "manual" && product.detail_page_id) {
      detailPageExcerpt = await getDetailPageExcerpt(supabase, user.id, product.detail_page_id);
    }

    const result = await generateAffiliatePostContent(
      {
        platform: product.platform,
        productName: product.product_name,
        price: product.price,
        affiliateUrl: product.affiliate_url,
        inputMode: product.input_mode,
        description: product.description,
        keySellingPoints: product.key_selling_points,
        detailPageExcerpt,
      },
      {
        tone: input.tone,
        keywords: input.keywords,
        referenceUrls: input.referenceUrls,
        provider,
        model,
      },
      apiKey,
    );

    await logProgramUsage({
      userId: user.id,
      action: `ai_generate_affiliate_post_${provider}`,
      metadata: { productId: product.id, platform: product.platform, model },
    });

    return { content: result.content };
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI 생성에 실패했습니다.";
    return { error: message };
  }
}

export async function getDisclosurePreviewAction(platform: "coupang" | "aliexpress" | "naver"): Promise<string | null> {
  return getDisclosureText(platform);
}

export async function generateImageAction(input: {
  prompt: string;
  provider?: ImageProvider;
  model?: string;
  apiKey?: string;
}): Promise<GenerateImageState> {
  const user = await requireProgramAccess();

  if (!input.prompt.trim()) {
    return { error: "이미지 프롬프트를 입력해주세요." };
  }

  const provider: ImageProvider = input.provider || "nanobanana";
  const model = input.model || DEFAULT_IMAGE_MODELS[provider];

  try {
    const supabase = await createClient();

    let keyProvider: "gemini" | "openai" | "replicate" = "gemini";
    let keyLabel = "Google Gemini (NanoBanana)";
    if (provider === "openai") {
      keyProvider = "openai";
      keyLabel = "OpenAI (GPT Image)";
    } else if (provider === "flux" || provider === "zimage") {
      keyProvider = "replicate";
      keyLabel = provider === "flux" ? "Replicate (FLUX)" : "Replicate (Z-Image)";
    }

    const apiKey = input.apiKey?.trim() || (await resolveApiKey(supabase, user.id, keyProvider));
    if (!apiKey) {
      return { error: `[${keyLabel}] API 키가 없습니다. 설정 메뉴에서 본인 API 키를 먼저 등록해주세요.` };
    }

    const result = await generateMultiPlatformImage({
      prompt: input.prompt,
      provider,
      model,
      apiKey,
      userId: user.id,
      supabase,
    });

    await logProgramUsage({
      userId: user.id,
      action: `ai_generate_image_${provider}`,
      metadata: { prompt: input.prompt, provider, model, imageUrl: result.imageUrl },
    });

    return { imageUrl: result.imageUrl };
  } catch (err) {
    const message = err instanceof Error ? err.message : "이미지 생성에 실패했습니다.";
    return { error: message };
  }
}
