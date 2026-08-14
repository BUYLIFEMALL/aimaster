"use server";

import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/apiKeys";
import { fetchImageAsBase64, generateSectionImageWithGemini, DEFAULT_IMAGE_MODEL } from "@/lib/ai/gemini";
import type { ImageModelKey } from "@/lib/ai/gemini";
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
  model: ImageModelKey = DEFAULT_IMAGE_MODEL,
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
      model,
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

/**
 * 나노바나나로 생성하지 않고, 사용자가 직접 보유한 이미지를 그 섹션의 이력에 추가하고
 * 곧바로 활성 이미지로 지정한다(업로드는 클라이언트에서 uploadCustomSectionImage로 직접 처리).
 */
export async function addCustomSectionImageAction(
  productId: string,
  templateId: string,
  imageUrl: string,
): Promise<GenerateSectionImageState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: product, error: productError } = await supabase
    .from("shop_products")
    .select("language")
    .eq("id", productId)
    .single();
  if (productError || !product) {
    return { error: "상품을 찾을 수 없습니다." };
  }

  const { data: template, error: templateError } = await supabase
    .from("shop_prompt_templates")
    .select("id, section_key, section_order")
    .eq("id", templateId)
    .single();
  if (templateError || !template) {
    return { error: "프롬프트 템플릿을 찾을 수 없습니다." };
  }

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
      image_url: imageUrl,
      image_urls: history,
    },
    { onConflict: "product_id,section_key,language" },
  );
  if (upsertError) {
    return { error: `이미지 정보 저장 실패: ${upsertError.message}` };
  }

  return { url: imageUrl, sectionKey: template.section_key };
}

/** 재생성 이력(image_urls) 중 하나를 그 섹션의 활성 이미지(image_url)로 전환한다. 새로 생성하지 않는다. */
export async function selectSectionImageAction(
  productId: string,
  sectionKey: string,
  language: string,
  imageUrl: string,
): Promise<{ error?: string }> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: row, error: rowError } = await supabase
    .from("shop_product_images")
    .select("image_urls")
    .eq("product_id", productId)
    .eq("section_key", sectionKey)
    .eq("language", language)
    .single();
  if (rowError || !row) {
    return { error: "이미지 이력을 찾을 수 없습니다." };
  }
  if (!row.image_urls.includes(imageUrl)) {
    return { error: "선택한 이미지가 이력에 없습니다." };
  }

  const { error: updateError } = await supabase
    .from("shop_product_images")
    .update({ image_url: imageUrl })
    .eq("product_id", productId)
    .eq("section_key", sectionKey)
    .eq("language", language)
    .eq("user_id", user.id);
  if (updateError) {
    return { error: updateError.message };
  }
  return {};
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
