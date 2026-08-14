"use server";

import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/apiKeys";
import { fetchImageAsBase64, generateSectionImageWithGemini } from "@/lib/ai/gemini";
import { applyProductVariables } from "@/lib/ai/promptTemplates";
import type { ProductStatus } from "@/types/database.types";

export interface GenerateSectionImageState {
  error?: string;
  needsApiKey?: boolean;
  url?: string;
  sectionKey?: string;
}

function extFromMime(mimeType: string): string {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  return "jpg";
}

/** n8n #1(이미지생성) 대응: 템플릿 1개 분량의 섹션 이미지를 생성해 Storage에 올리고 DB에 반영한다. */
export async function generateSectionImageAction(
  productId: string,
  templateId: string,
): Promise<GenerateSectionImageState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const apiKey = await resolveApiKey(supabase, user.id, "gemini");
  if (!apiKey) {
    return { needsApiKey: true };
  }

  const { data: product, error: productError } = await supabase
    .from("shop_products")
    .select("*")
    .eq("id", productId)
    .single();
  if (productError || !product) {
    return { error: "상품을 찾을 수 없습니다." };
  }
  if (!product.source_image_url) {
    return { error: "상품 원본 이미지가 없습니다." };
  }

  const { data: template, error: templateError } = await supabase
    .from("shop_prompt_templates")
    .select("*")
    .eq("id", templateId)
    .single();
  if (templateError || !template) {
    return { error: "프롬프트 템플릿을 찾을 수 없습니다." };
  }

  try {
    const referenceImage = await fetchImageAsBase64(product.source_image_url);
    let finalPrompt = applyProductVariables(template.prompt_template, product) + (template.korean_guide ?? "");
    if (product.image_generation_notes?.trim()) {
      finalPrompt += `\n\nAdditional instructions: ${product.image_generation_notes.trim()}`;
    }

    const generated = await generateSectionImageWithGemini({
      prompt: finalPrompt,
      referenceImage,
      aspectRatio: template.aspect_ratio,
      resolution: template.resolution,
      apiKey,
    });

    const ext = extFromMime(generated.mimeType);
    const path = `${user.id}/products/${productId}/generated/${template.section_key}-${Date.now()}.${ext}`;
    const buffer = Buffer.from(generated.base64, "base64");

    const { error: uploadError } = await supabase.storage
      .from("shop-detail-images")
      .upload(path, buffer, { contentType: generated.mimeType, upsert: false });
    if (uploadError) {
      return { error: `이미지 업로드 실패: ${uploadError.message}` };
    }

    const { data: publicUrlData } = supabase.storage.from("shop-detail-images").getPublicUrl(path);
    const imageUrl = publicUrlData.publicUrl;

    const { data: existing } = await supabase
      .from("shop_product_images")
      .select("image_urls")
      .eq("product_id", productId)
      .eq("section_key", template.section_key)
      .eq("language", product.language)
      .maybeSingle();

    const history = [...(existing?.image_urls ?? []), imageUrl];

    const { error: upsertError } = await supabase.from("shop_product_images").upsert(
      {
        product_id: productId,
        user_id: user.id,
        template_id: template.id,
        section_key: template.section_key,
        section_order: template.section_order,
        language: product.language,
        prompt_used: finalPrompt,
        image_url: imageUrl,
        image_urls: history,
      },
      { onConflict: "product_id,section_key,language" },
    );
    if (upsertError) {
      return { error: `이미지 정보 저장 실패: ${upsertError.message}` };
    }

    return { url: imageUrl, sectionKey: template.section_key };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "이미지 생성 중 오류가 발생했습니다." };
  }
}

/** 상품 상태(생성중/완료/에러)를 갱신한다. 전체 생성 배치의 시작/종료 시 호출한다. */
export async function setProductStatusAction(productId: string, status: ProductStatus) {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  await supabase
    .from("shop_products")
    .update({ status })
    .eq("id", productId)
    .eq("user_id", user.id);
}
