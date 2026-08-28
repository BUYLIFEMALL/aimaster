"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess, logProgramUsage } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/apiKeys";
import { searchProducts as searchCoupangProducts, createDeeplink, type CoupangProduct } from "@/lib/coupang/client";
import { getPromotionLinks } from "@/lib/aliexpress/client";
import { analyzeProductAppeal, type ProductAppealAnalysis } from "@/lib/ai/productAnalyzer";

function parseEnrichmentFields(formData: FormData) {
  const description = String(formData.get("description") ?? "").trim();
  const sellingPointsRaw = String(formData.get("keySellingPoints") ?? "");
  const keySellingPoints = sellingPointsRaw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const detailPageId = String(formData.get("detailPageId") ?? "").trim();
  const imageUrl = String(formData.get("imageUrl") ?? "").trim();

  const hasEnrichment = Boolean(description || keySellingPoints.length > 0 || detailPageId);

  return {
    input_mode: (hasEnrichment ? "manual" : "url") as "manual" | "url",
    description: description || null,
    key_selling_points: keySellingPoints.length > 0 ? keySellingPoints : null,
    detail_page_id: detailPageId || null,
    image_url: imageUrl || null,
  };
}

export interface SearchCoupangState {
  results?: CoupangProduct[];
  error?: string;
}

/**
 * 쿠팡 키워드 검색. DB에 저장하지 않고 결과만 반환한다 — 사용자가 그중 하나를
 * 골라서 registerCoupangProductAction으로 등록한다. 검색 API는 시간당 호출 제한이
 * 있다고 알려져 있으니(공식 수치 재확인 필요) 화면에서 반복 검색을 자제하도록 안내한다.
 */
export async function searchCoupangProductsAction(keyword: string): Promise<SearchCoupangState> {
  const user = await requireProgramAccess();
  if (!keyword.trim()) return { error: "검색어를 입력해주세요." };

  const supabase = await createClient();
  const [accessKey, secretKey] = await Promise.all([
    resolveApiKey(supabase, user.id, "coupang_access_key"),
    resolveApiKey(supabase, user.id, "coupang_secret_key"),
  ]);
  if (!accessKey || !secretKey) {
    return { error: "쿠팡파트너스 Access Key/Secret Key가 없습니다. 설정 페이지에서 먼저 등록해주세요." };
  }

  try {
    const results = await searchCoupangProducts(keyword.trim(), { accessKey, secretKey, limit: 10 });
    return { results };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "쿠팡 상품 검색에 실패했습니다." };
  }
}

export interface RegisterProductState {
  error?: string;
  success?: boolean;
}

/** 쿠팡 검색 결과에서 고른 상품 1건을 딥링크로 변환해 등록한다. */
export async function registerCoupangProductAction(
  _prevState: RegisterProductState,
  formData: FormData,
): Promise<RegisterProductState> {
  const user = await requireProgramAccess();
  const productName = String(formData.get("productName") ?? "").trim();
  const productUrl = String(formData.get("productUrl") ?? "").trim();
  const priceRaw = String(formData.get("price") ?? "").trim();

  if (!productName || !productUrl) {
    return { error: "상품 정보가 올바르지 않습니다. 다시 검색해서 선택해주세요." };
  }

  const supabase = await createClient();
  const [accessKey, secretKey] = await Promise.all([
    resolveApiKey(supabase, user.id, "coupang_access_key"),
    resolveApiKey(supabase, user.id, "coupang_secret_key"),
  ]);
  if (!accessKey || !secretKey) {
    return { error: "쿠팡파트너스 Access Key/Secret Key가 없습니다. 설정 페이지에서 먼저 등록해주세요." };
  }

  try {
    const [deeplink] = await createDeeplink([productUrl], { accessKey, secretKey });
    if (!deeplink?.shortenUrl) {
      return { error: "딥링크 생성에 실패했습니다." };
    }

    const enrichment = parseEnrichmentFields(formData);

    const { error } = await supabase.from("affiliate_products").insert({
      user_id: user.id,
      platform: "coupang",
      product_name: productName,
      product_url: productUrl,
      affiliate_url: deeplink.shortenUrl,
      price: priceRaw ? Number(priceRaw) : null,
      ...enrichment,
    });
    if (error) return { error: error.message };

    await logProgramUsage({ userId: user.id, action: "register_coupang_product" });
    revalidatePath("/products");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "쿠팡 딥링크 생성에 실패했습니다." };
  }
}

/** 알리익스프레스 상품 URL을 제휴 링크로 변환해 등록한다. */
export async function registerAliexpressProductAction(
  _prevState: RegisterProductState,
  formData: FormData,
): Promise<RegisterProductState> {
  const user = await requireProgramAccess();
  const productName = String(formData.get("productName") ?? "").trim();
  const productUrl = String(formData.get("productUrl") ?? "").trim();

  if (!productName || !productUrl) {
    return { error: "상품명과 상품 URL을 입력해주세요." };
  }

  const supabase = await createClient();
  const [appKey, appSecret, trackingId] = await Promise.all([
    resolveApiKey(supabase, user.id, "aliexpress_app_key"),
    resolveApiKey(supabase, user.id, "aliexpress_app_secret"),
    resolveApiKey(supabase, user.id, "aliexpress_tracking_id"),
  ]);
  if (!appKey || !appSecret) {
    return { error: "알리익스프레스 App Key/Secret이 없습니다. 설정 페이지에서 먼저 등록해주세요." };
  }
  if (!trackingId) {
    return { error: "알리익스프레스 Tracking ID가 없습니다. 설정 페이지에서 먼저 등록해주세요." };
  }

  try {
    const [link] = await getPromotionLinks([productUrl], {
      appKey,
      appSecret,
      trackingId,
    });
    if (!link?.promotionLink) {
      return { error: "제휴 링크 생성에 실패했습니다." };
    }

    const enrichment = parseEnrichmentFields(formData);

    const { error } = await supabase.from("affiliate_products").insert({
      user_id: user.id,
      platform: "aliexpress",
      product_name: productName,
      product_url: productUrl,
      affiliate_url: link.promotionLink,
      ...enrichment,
    });
    if (error) return { error: error.message };

    await logProgramUsage({ userId: user.id, action: "register_aliexpress_product" });
    revalidatePath("/products");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "알리익스프레스 링크 변환에 실패했습니다." };
  }
}

/** 네이버 브랜드커넥트는 공식 API가 없어, 사용자가 직접 발급받은 링크를 그대로 저장한다. */
export async function registerNaverProductAction(
  _prevState: RegisterProductState,
  formData: FormData,
): Promise<RegisterProductState> {
  const user = await requireProgramAccess();
  const productName = String(formData.get("productName") ?? "").trim();
  const affiliateUrl = String(formData.get("affiliateUrl") ?? "").trim();

  if (!productName || !affiliateUrl) {
    return { error: "상품명과 네이버에서 발급받은 링크를 입력해주세요." };
  }

  const supabase = await createClient();
  const enrichment = parseEnrichmentFields(formData);

  const { error } = await supabase.from("affiliate_products").insert({
    user_id: user.id,
    platform: "naver",
    product_name: productName,
    product_url: null,
    affiliate_url: affiliateUrl,
    ...enrichment,
  });
  if (error) return { error: error.message };

  await logProgramUsage({ userId: user.id, action: "register_naver_product" });
  revalidatePath("/products");
  return { success: true };
}

export interface AnalyzeProductImagesState {
  result?: ProductAppealAnalysis;
  error?: string;
}

/**
 * 업로드된 상품/상세페이지 이미지(+ 이미 입력된 상품명/설명)를 보고 핵심 소구점을
 * 추출한다. auto-detail-page(상세페이지 자동화)가 이미지를 보고 콘텐츠를 만드는 방식을
 * 참고해서 만들었다 — 결과는 저장하지 않고 화면에 반환만 하며, 사용자가 검토·수정 후
 * "상품 설명"/"핵심 셀링포인트" 칸에 반영할지 직접 선택한다.
 */
export async function analyzeProductImagesAction(formData: FormData): Promise<AnalyzeProductImagesState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const apiKey = await resolveApiKey(supabase, user.id, "openai");
  if (!apiKey) {
    return { error: "OpenAI API 키가 없습니다. 설정 페이지에서 본인 키를 먼저 등록해주세요." };
  }

  const files = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) {
    return { error: "분석할 이미지를 1장 이상 선택해주세요." };
  }

  try {
    const images = await Promise.all(
      files.map(async (file) => ({
        base64: Buffer.from(await file.arrayBuffer()).toString("base64"),
        mimeType: file.type || "image/jpeg",
      })),
    );

    const productName = String(formData.get("productName") ?? "").trim();
    const sourceText = String(formData.get("sourceText") ?? "").trim();

    const result = await analyzeProductAppeal(
      images,
      { productName: productName || null, sourceText: sourceText || null },
      apiKey,
    );

    await logProgramUsage({ userId: user.id, action: "analyze_product_images" });
    return { result };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "이미지 분석에 실패했습니다." };
  }
}

export interface UploadProductImageState {
  url?: string;
  error?: string;
}

/** 분석 단계에서 업로드한 이미지 1장을 게시글용 대표 이미지로 확정해 Storage에 저장한다. */
export async function uploadProductImageAction(formData: FormData): Promise<UploadProductImageState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "업로드할 이미지를 선택해주세요." };
  }

  try {
    const ext = (file.type.split("/")[1] || "jpg").replace(/[^a-z0-9]/gi, "") || "jpg";
    const path = `${user.id}/products/${crypto.randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("post-images")
      .upload(path, buffer, { contentType: file.type || "image/jpeg", upsert: false });
    if (uploadError) throw new Error(uploadError.message);

    const { data } = supabase.storage.from("post-images").getPublicUrl(path);
    return { url: data.publicUrl };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "이미지 업로드에 실패했습니다." };
  }
}

export async function deleteProductAction(formData: FormData) {
  const productId = String(formData.get("productId"));
  const user = await requireProgramAccess();
  const supabase = await createClient();

  await supabase.from("affiliate_products").delete().eq("id", productId).eq("user_id", user.id);

  revalidatePath("/products");
}
