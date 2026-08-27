"use server";

import { createClient } from "@/lib/supabase/server";
import { generateAffiliatePostContent, getDisclosureText } from "@/lib/ai/affiliateGenerator";
import { generatePostImage, type NanoBananaModelType } from "@/lib/ai/generator";
import type { ThreadsTone } from "@/lib/ai/generator";
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
  apiKey?: string;
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

    const apiKey = input.apiKey?.trim() || (await resolveApiKey(supabase, user.id, "openai"));
    if (!apiKey) {
      return { error: "OpenAI API 키가 없습니다. 설정 페이지에서 본인 키를 등록해주세요." };
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
      { tone: input.tone, keywords: input.keywords },
      apiKey,
    );

    await logProgramUsage({
      userId: user.id,
      action: "ai_generate_affiliate_post",
      metadata: { productId: product.id, platform: product.platform },
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

    await logProgramUsage({ userId: user.id, action: "ai_generate_image", metadata: { prompt: input.prompt } });

    return { imageUrl: data.publicUrl };
  } catch (err) {
    const message = err instanceof Error ? err.message : "이미지 생성에 실패했습니다.";
    return { error: message };
  }
}
