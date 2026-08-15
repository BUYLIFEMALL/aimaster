"use server";

import { redirect } from "next/navigation";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/apiKeys";
import {
  analyzeProductWithGemini,
  fetchImageAsBase64,
  parseJsonFromModelText,
} from "@/lib/ai/gemini";
import { buildProductAnalysisPrompt, type RawProductAnalysis } from "@/lib/ai/productAnalysisPrompt";
import { flattenProductAnalysis, type FlatProductAnalysis } from "@/lib/ai/flattenAnalysis";
import { IMAGE_MODELS, DEFAULT_IMAGE_MODEL, type ImageModelKey } from "@/lib/ai/imageModels";

export interface AnalyzeProductState {
  error?: string;
  needsApiKey?: boolean;
  data?: FlatProductAnalysis;
}

const MAX_REFERENCE_IMAGES = 10;

/**
 * n8n #0(상품분석) 대응: 대표이미지 + 참고이미지(최대 10장) + 선택 텍스트를 Gemini로 분석해
 * 폼에 채울 필드를 반환한다. 여러 장을 함께 보내면 분석 정확도가 올라간다.
 */
export async function analyzeProductAction(formData: FormData): Promise<AnalyzeProductState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const sourceImageUrl = String(formData.get("sourceImageUrl") ?? "").trim();
  const sourceText = String(formData.get("sourceText") ?? "").trim();
  const referenceImageUrls = formData
    .getAll("referenceImageUrls")
    .map((v) => String(v).trim())
    .filter(Boolean)
    .slice(0, MAX_REFERENCE_IMAGES);

  if (!sourceImageUrl) {
    return { error: "먼저 대표이미지를 업로드해주세요." };
  }

  const apiKey = await resolveApiKey(supabase, user.id, "gemini");
  if (!apiKey) {
    return { needsApiKey: true };
  }

  try {
    const allImageUrls = [sourceImageUrl, ...referenceImageUrls];
    const images = await Promise.all(allImageUrls.map((url) => fetchImageAsBase64(url)));
    const prompt = buildProductAnalysisPrompt(sourceText || null, images.length);
    const text = await analyzeProductWithGemini({ prompt, images, apiKey });
    const raw = parseJsonFromModelText<RawProductAnalysis>(text);
    return { data: flattenProductAnalysis(raw) };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "상품분석 중 오류가 발생했습니다." };
  }
}

/** 분석 결과(사용자가 검토/수정 가능)를 실제 상품으로 저장한다. */
export async function createProductAction(formData: FormData) {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const sourceImageUrl = String(formData.get("sourceImageUrl") ?? "").trim();
  if (!sourceImageUrl) {
    return { error: "대표이미지가 없습니다." };
  }
  const referenceImageUrls = formData
    .getAll("referenceImageUrls")
    .map((v) => String(v).trim())
    .filter(Boolean)
    .slice(0, MAX_REFERENCE_IMAGES);

  const moodKeywordsRaw = String(formData.get("moodKeywords") ?? "");
  const moodKeywords = moodKeywordsRaw
    .split(/[,、\n]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const priceRaw = String(formData.get("price") ?? "").trim();
  const salePriceRaw = String(formData.get("salePrice") ?? "").trim();

  const defaultImageModelRaw = String(formData.get("defaultImageModel") ?? "");
  const defaultImageModel: ImageModelKey =
    defaultImageModelRaw in IMAGE_MODELS ? (defaultImageModelRaw as ImageModelKey) : DEFAULT_IMAGE_MODEL;

  const { data, error } = await supabase
    .from("shop_products")
    .insert({
      user_id: user.id,
      product_label: String(formData.get("productLabel") ?? "").trim() || null,
      name: String(formData.get("name") ?? "").trim() || null,
      category: String(formData.get("category") ?? "").trim() || null,
      price: priceRaw ? Number(priceRaw) : null,
      sale_price: salePriceRaw ? Number(salePriceRaw) : null,
      key_features: String(formData.get("keyFeatures") ?? "").trim() || null,
      specs: String(formData.get("specs") ?? "").trim() || null,
      how_to_use: String(formData.get("howToUse") ?? "").trim() || null,
      target_customer: String(formData.get("targetCustomer") ?? "").trim() || null,
      main_color: String(formData.get("mainColor") ?? "").trim() || null,
      sub_color: String(formData.get("subColor") ?? "").trim() || null,
      background_style: String(formData.get("backgroundStyle") ?? "").trim() || null,
      mood_keywords: moodKeywords,
      font_style: String(formData.get("fontStyle") ?? "").trim() || null,
      layout_density: String(formData.get("layoutDensity") ?? "").trim() || null,
      source_image_url: sourceImageUrl,
      reference_image_urls: referenceImageUrls,
      image_generation_notes: String(formData.get("imageGenerationNotes") ?? "").trim() || null,
      default_image_model: defaultImageModel,
      status: "analyzed",
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "상품 저장에 실패했습니다." };
  }

  redirect(`/products/${data.id}`);
}
