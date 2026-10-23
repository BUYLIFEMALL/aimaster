"use server";

import { redirect } from "next/navigation";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/apiKeys";
import {
  analyzeProductWithGemini,
  parseJsonFromModelText,
} from "@/lib/ai/gemini";
import { downloadImageAsBase64 } from "@/lib/storageImage";
import { buildNameAnalysisPrompt, buildProductAnalysisPrompt, type RawProductAnalysis } from "@/lib/ai/productAnalysisPrompt";
import { flattenProductAnalysis, type FlatProductAnalysis } from "@/lib/ai/flattenAnalysis";
import { IMAGE_MODELS, DEFAULT_IMAGE_MODEL, type ImageModelKey } from "@/lib/ai/imageModels";
import { toLayoutPreset } from "@/lib/layoutPresets";

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

  const specDocumentUrl = String(formData.get("specDocumentUrl") ?? "").trim();
  const productNameHint = String(formData.get("productNameHint") ?? "").trim();

  if (!sourceImageUrl) {
    return { error: "먼저 대표이미지를 업로드해주세요." };
  }

  const apiKey = await resolveApiKey(supabase, user.id, "gemini");
  if (!apiKey) {
    return { needsApiKey: true };
  }

  try {
    const allImageUrls = [sourceImageUrl, ...referenceImageUrls];
    const images = await Promise.all(allImageUrls.map((url) => downloadImageAsBase64(supabase, url)));
    const imageCount = images.length;
    if (specDocumentUrl) {
      // 사양서 PDF도 같은 inlineData 조각으로 넘긴다(Gemini는 application/pdf를 문서로 읽음).
      const doc = await downloadImageAsBase64(supabase, specDocumentUrl);
      images.push({ base64: doc.base64, mimeType: "application/pdf" });
    }
    const prompt = buildProductAnalysisPrompt(sourceText || null, imageCount, {
      hasSpecDocument: Boolean(specDocumentUrl),
      productNameHint,
    });
    const text = await analyzeProductWithGemini({ prompt, images, apiKey });
    const raw = parseJsonFromModelText<RawProductAnalysis>(text);
    return { data: flattenProductAnalysis(raw) };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "상품분석 중 오류가 발생했습니다." };
  }
}

/**
 * v1.23(AI 12단 「상품명만으로 채우기」 이관): 사진 없이 상품명(과 원본 정보)만으로 분석 입력칸을 채운다.
 * 회원 본인 Gemini 키, 글만 보내는 분석 1회. 결과는 AI 추정값이라 화면에서 확인 안내를 띄운다.
 * 저장·섹션 이미지 생성에는 지금처럼 실제 상품 사진이 필요하다(사진 없는 상품 그림으로 구매자가 오해하지 않게).
 */
export async function analyzeByNameAction(formData: FormData): Promise<AnalyzeProductState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const productName = String(formData.get("productName") ?? "").trim().slice(0, 200);
  const sourceText = String(formData.get("sourceText") ?? "").trim();
  if (!productName) {
    return { error: "상품명을 먼저 입력해주세요." };
  }

  const apiKey = await resolveApiKey(supabase, user.id, "gemini");
  if (!apiKey) {
    return { needsApiKey: true };
  }

  try {
    const text = await analyzeProductWithGemini({
      prompt: buildNameAnalysisPrompt(productName, sourceText || null),
      images: [],
      apiKey,
    });
    const raw = parseJsonFromModelText<RawProductAnalysis>(text);
    return { data: flattenProductAnalysis(raw) };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "상품명 분석 중 오류가 발생했습니다." };
  }
}

/**
 * v1.24: 상품별 섹션 순서 저장(「↑」「↓」). null이면 기본 순서로 되돌린다.
 * 회원 본인 상품만(RLS + user_id 조건). 섹션 이름은 1~100자, 최대 40개, 중복 없이.
 */
export async function saveSectionSequenceAction(
  productId: string,
  keys: string[] | null,
): Promise<{ error?: string }> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  if (keys !== null) {
    const valid =
      Array.isArray(keys) &&
      keys.length <= 40 &&
      new Set(keys).size === keys.length &&
      keys.every((k) => typeof k === "string" && k.length >= 1 && k.length <= 100);
    if (!valid) return { error: "섹션 순서 값이 올바르지 않습니다." };
  }

  const { error } = await supabase
    .from("shop_products")
    .update({ section_sequence: keys })
    .eq("id", productId)
    .eq("user_id", user.id);
  if (error) return { error: `순서 저장 실패: ${error.message}` };
  return {};
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
      layout_preset: toLayoutPreset(formData.get("layoutPreset")),
      status: "analyzed",
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "상품 저장에 실패했습니다." };
  }

  redirect(`/products/${data.id}`);
}

export interface ImportLegacyProductInput {
  title: string;
  productName: string;
  originalPrice?: number | null;
  salePrice?: number | null;
  description?: string;
  targetAudience?: string;
  toneAndManner?: string;
  specDocContent?: string;
  platform: "coupang" | "smartstore";
  sourceImageUrl: string;
}

export interface ImportLegacyProductResult {
  error?: string;
  productId?: string;
  templates?: { id: string; section_key: string; section_order: number }[];
}

/**
 * v1.16(이커머스 병합 E1): AI 12단 상세페이지(detail-page-12p)의 JSON 백업 한 프로젝트를 상품으로 만든다.
 * 12단은 결과를 브라우저에만 저장했으므로, 회원이 12단 화면에서 내려받은 백업 파일을 여기서 올린다.
 * 이미지는 브라우저가 본인 폴더에 먼저 올리고(uploadImageDirect), 장면 이미지는 반환된 템플릿에
 * addCustomSectionImageAction으로 붙인다. AI 호출 없음.
 */
export async function importLegacyProductAction(input: ImportLegacyProductInput): Promise<ImportLegacyProductResult> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  if (!input.sourceImageUrl?.trim()) {
    return { error: "대표이미지가 없습니다." };
  }
  const layoutPreset = input.platform === "smartstore" ? "smartstore9" : "coupang12";
  const clip = (v: string | undefined, max: number) => (v ?? "").trim().slice(0, max) || null;
  const num = (v: number | null | undefined) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.round(v) : null);

  const { data, error } = await supabase
    .from("shop_products")
    .insert({
      user_id: user.id,
      product_label: clip(input.title, 200),
      name: clip(input.productName, 200),
      price: num(input.originalPrice),
      sale_price: num(input.salePrice),
      key_features: clip(input.description, 4000),
      specs: clip(input.specDocContent, 8000),
      target_customer: clip(input.targetAudience, 1000),
      mood_keywords: input.toneAndManner?.trim() ? [input.toneAndManner.trim().slice(0, 100)] : [],
      source_image_url: input.sourceImageUrl.trim(),
      reference_image_urls: [],
      layout_preset: layoutPreset,
      status: "analyzed",
    })
    .select("id")
    .single();
  if (error || !data) {
    return { error: error?.message ?? "상품 저장에 실패했습니다." };
  }

  const { data: templates } = await supabase
    .from("shop_prompt_templates")
    .select("id, section_key, section_order")
    .is("user_id", null)
    .eq("layout_preset", layoutPreset)
    .eq("is_active", true)
    .order("section_order", { ascending: true });

  return { productId: data.id, templates: templates ?? [] };
}
