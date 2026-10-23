"use server";

import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/apiKeys";
import { generateSectionImageWithGemini, DEFAULT_IMAGE_MODEL } from "@/lib/ai/gemini";
import { downloadImageAsBase64 } from "@/lib/storageImage";
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

// 템플릿(시스템 기본 + 사용자 커스텀)에 인물이 등장할 경우의 기본 묘사 지침. 개별
// 템플릿의 korean_guide를 일일이 수정하는 대신 조립 단계에서 공통 적용해, 앞으로
// 추가되는 템플릿에도 자동으로 반영되게 한다.
const KOREAN_DEFAULT_PEOPLE_GUIDE =
  "\n\nIf this scene includes any human figures, depict them as Korean/East Asian people by default. Only depict a different ethnicity/nationality if the prompt above explicitly calls for a specific foreign celebrity, politician, entertainer, or athlete, or explicitly describes a foreign country/setting.";

// v1.18: 할인가가 비어 있는 상품은 어떤 템플릿(시스템·회원 커스텀, 모든 규격)이든 혜택 문구를 지어내지 않게 한다.
// 2026-10-22 실제 시험에서 쿠팡 12단 배너에 상품 정보에 없는 「런칭 특가」「한정 수량 특별 혜택」이 그려졌다(S-22-03).
const NO_PRICE_PROMOTION_GUIDE =
  "\n\nNo price or promotion information was provided for this product. Do NOT render any price, discount, percentage off, 'sale', '특가', '런칭 특가', '한정', 'limited quantity/time', countdown, event, coupon, free gift or giveaway wording. Use the product name and its real features as the headline instead.";

/**
 * v1.19(D-48-01): 섹션 이력 뒤에 새 이미지를 붙이고 활성 이미지로 지정한다.
 * DB 함수가 한 문장으로 붙이므로 같은 섹션을 동시에 만들어도 이력이 덮어써지지 않는다.
 * 함수가 아직 적용되지 않은 DB에서는 예전 방식(읽은 뒤 upsert)으로 동작한다.
 */
async function appendSectionImage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  args: {
    productId: string;
    templateId: string;
    sectionKey: string;
    sectionOrder: number;
    language: string;
    imageUrl: string;
    promptUsed?: string;
  },
): Promise<{ error?: string }> {
  const { error: rpcError } = await supabase.rpc("shop_append_section_image", {
    p_product_id: args.productId,
    p_template_id: args.templateId,
    p_section_key: args.sectionKey,
    p_section_order: args.sectionOrder,
    p_language: args.language,
    p_image_url: args.imageUrl,
    p_prompt_used: args.promptUsed ?? null,
  });
  if (!rpcError) return {};
  if (rpcError.code !== "PGRST202" && rpcError.code !== "42883") return { error: rpcError.message };

  const { data: existing } = await supabase
    .from("shop_product_images")
    .select("image_urls")
    .eq("product_id", args.productId)
    .eq("section_key", args.sectionKey)
    .eq("language", args.language)
    .maybeSingle();

  const { error: upsertError } = await supabase.from("shop_product_images").upsert(
    {
      product_id: args.productId,
      user_id: userId,
      template_id: args.templateId,
      section_key: args.sectionKey,
      section_order: args.sectionOrder,
      language: args.language,
      ...(args.promptUsed ? { prompt_used: args.promptUsed } : {}),
      image_url: args.imageUrl,
      image_urls: [...(existing?.image_urls ?? []), args.imageUrl],
    },
    { onConflict: "product_id,section_key,language" },
  );
  return upsertError ? { error: upsertError.message } : {};
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
    const referenceImage = await downloadImageAsBase64(supabase, product.source_image_url);
    let finalPrompt =
      applyProductVariables(template.prompt_template, product) +
      (template.korean_guide ?? "") +
      KOREAN_DEFAULT_PEOPLE_GUIDE +
      (product.sale_price == null ? NO_PRICE_PROMOTION_GUIDE : "");
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

    const { error: upsertError } = await appendSectionImage(supabase, user.id, {
      productId,
      templateId: template.id,
      sectionKey: template.section_key,
      sectionOrder: template.section_order,
      language: product.language,
      imageUrl,
      promptUsed: finalPrompt,
    });
    if (upsertError) {
      // 업로드는 됐는데 DB 반영이 실패하면 파일만 남으므로 지운다(D-48-01 고아 파일).
      await supabase.storage.from("shop-detail-images").remove([path]);
      return { error: `이미지 정보 저장 실패: ${upsertError}` };
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

  const { error: upsertError } = await appendSectionImage(supabase, user.id, {
    productId,
    templateId: template.id,
    sectionKey: template.section_key,
    sectionOrder: template.section_order,
    language: product.language,
    imageUrl,
  });
  if (upsertError) {
    return { error: `이미지 정보 저장 실패: ${upsertError}` };
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
