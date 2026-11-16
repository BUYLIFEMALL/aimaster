"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess, logProgramUsage } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/apiKeys";
import {
  getCoupangBestCategory,
  getCoupangGoldbox,
  getCoupangPl,
  searchCoupangProducts,
} from "@/lib/affiliate-clients/coupangApi";
import {
  COUPANG_CATEGORY_OPTIONS,
  hasCoupangProductSource,
  normalizeCoupangProductSearchSettings,
  splitCoupangKeywords,
} from "@/lib/coupang/catalog";
import {
  coupangSourceKeyOf,
  selectCoupangProductCandidates,
  toCoupangCandidates,
  type CoupangCandidate,
} from "@/lib/coupang/productSelection";
import {
  checkCoupangAffiliateLink,
  COUPANG_LINK_MESSAGES,
  extractCoupaNgUrl,
  parseCoupangShareCode,
} from "@/lib/affiliate-clients/coupangLinks";
import { cropPhotoFromCoupangBanner } from "@/lib/affiliate-clients/coupangBanner";
import { ALIEXPRESS_IMAGE_WARNING, findAliexpressImage, getPromotionLinks, normalizeImageUrl, resolveAliexpressUrl } from "@/lib/affiliate-clients/aliexpress";
import {
  getBestSelling,
  getCategories,
  getCategoryBestSelling,
  getTodayDeals,
  issueShareLink,
  type TossProduct,
  type TossCategory,
} from "@/lib/affiliate-clients/toss";
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

export interface MultiSourceSearchState {
  results?: CoupangCandidate[];
  /** 이미 등록한 상품이라 뺀 개수. */
  excludedCount?: number;
  /** 일부 경로만 실패했을 때의 안내(성공한 경로 결과는 그대로 보여 준다). */
  warnings?: string[];
  error?: string;
}

/**
 * 쿠팡 여러 경로 검색 — threads-auto(MIT, bd2fec7) src/main/ipc/register.ts `coupang-products:search` 흐름을 옮김.
 * 키워드(쉼표·줄바꿈, 최대 10개, 키워드당 상위 10개)·골드박스·카테고리 베스트(전체=19개 카테고리)·쿠팡 PL을 4개씩 동시에 부르고,
 * 결과를 합쳐 로켓 조건·이미 등록한 상품을 거른 뒤 최대 100개를 돌려준다. 원본은 경로 하나만 실패해도 전체가 실패했지만,
 * 여기서는 성공한 경로 결과를 살리고 실패한 경로는 안내로 알린다. DB에는 저장하지 않는다(등록은 회원이 고른 것만).
 */
export async function searchCoupangMultiSourceAction(raw: Record<string, unknown>): Promise<MultiSourceSearchState> {
  const user = await requireProgramAccess();
  const settings = normalizeCoupangProductSearchSettings(raw ?? {});
  if (!hasCoupangProductSource(settings)) return { error: "검색 경로를 하나 이상 골라 주세요." };
  const terms = splitCoupangKeywords(settings.keywords);
  if (settings.keywordSearchIncluded && terms.length === 0 && !settings.goldBoxIncluded && !settings.categoryBestIncluded && !settings.coupangPlIncluded) {
    return { error: "검색어를 입력해 주세요. 여러 개는 쉼표로 나눕니다." };
  }

  const supabase = await createClient();
  const [accessKey, secretKey] = await Promise.all([
    resolveApiKey(supabase, user.id, "coupang_access_key"),
    resolveApiKey(supabase, user.id, "coupang_secret_key"),
  ]);
  if (!accessKey || !secretKey) {
    return { error: "쿠팡파트너스 Access Key/Secret Key가 없습니다. 설정 페이지에서 먼저 등록해주세요." };
  }
  const auth = { accessKey, secretKey };

  const tasks: Array<{ label: string; run: () => Promise<CoupangCandidate[]> }> = [];
  if (settings.keywordSearchIncluded) {
    for (const keyword of terms) {
      const query = settings.rocketFreshOnly ? `${keyword} 로켓프레시` : keyword;
      tasks.push({ label: `키워드 「${keyword}」`, run: async () => toCoupangCandidates(await searchCoupangProducts(query, { ...auth, limit: 10 }), "SEARCH") });
    }
  }
  if (settings.goldBoxIncluded) tasks.push({ label: "골드박스", run: async () => toCoupangCandidates(await getCoupangGoldbox(auth), "GOLDBOX") });
  if (settings.categoryBestIncluded) {
    const ids = settings.categoryId === "ALL" ? COUPANG_CATEGORY_OPTIONS.map(([id]) => id) : [settings.categoryId];
    for (const id of ids) {
      const name = COUPANG_CATEGORY_OPTIONS.find(([cid]) => cid === id)?.[1] ?? id;
      tasks.push({ label: `카테고리 베스트 「${name}」`, run: async () => toCoupangCandidates(await getCoupangBestCategory(id, auth), "CATEGORY_BEST") });
    }
  }
  if (settings.coupangPlIncluded) {
    const brandId = settings.coupangPlBrandId === "ALL" ? undefined : settings.coupangPlBrandId;
    tasks.push({ label: "쿠팡 PL", run: async () => toCoupangCandidates(await getCoupangPl(brandId, auth), "COUPANG_PL") });
  }

  const batches: CoupangCandidate[][] = [];
  const warnings: string[] = [];
  for (let i = 0; i < tasks.length; i += 4) {
    const slice = tasks.slice(i, i + 4);
    const settled = await Promise.allSettled(slice.map((task) => task.run()));
    settled.forEach((result, idx) => {
      if (result.status === "fulfilled") batches.push(result.value);
      else warnings.push(`${slice[idx].label}: ${result.reason instanceof Error ? result.reason.message : "실패"}`);
    });
  }
  if (batches.length === 0) return { error: warnings[0] ?? "쿠팡 상품을 불러오지 못했습니다.", warnings };

  // 회원 본인이 이미 등록한 쿠팡 상품 번호(RLS + user_id 조건).
  const { data: rows } = await supabase
    .from("affiliate_products")
    .select("source_key, product_url")
    .eq("user_id", user.id)
    .eq("platform", "coupang");
  const registered = new Set((rows ?? []).map(coupangSourceKeyOf).filter((v): v is string => Boolean(v)));

  const all = batches.flat();
  const withoutExclude = selectCoupangProductCandidates(all, { keywords: terms, rocketOnly: settings.rocketOnly, rocketFreshOnly: settings.rocketFreshOnly, limit: 100 });
  const results = selectCoupangProductCandidates(all, {
    keywords: terms, rocketOnly: settings.rocketOnly, rocketFreshOnly: settings.rocketFreshOnly, limit: 100, excludedSourceKeys: registered,
  });
  const excludedCount = withoutExclude.filter((c) => registered.has(c.sourceKey)).length;
  await logProgramUsage({ userId: user.id, action: "search_coupang_multi_source" });
  return { results, excludedCount, warnings: warnings.length ? warnings : undefined };
}

export interface BulkRegisterItem {
  sourceKey: string;
  productName: string;
  productUrl: string;
  imageUrl: string;
  price: number;
}

/** 검색 결과에서 체크한 쿠팡 상품을 한 번에 등록한다(최대 30개). 이미 등록한 상품 번호는 건너뛴다. */
export async function registerCoupangProductsBulkAction(items: BulkRegisterItem[]): Promise<{ inserted?: number; skipped?: number; error?: string }> {
  const user = await requireProgramAccess();
  if (!Array.isArray(items) || items.length === 0) return { error: "등록할 상품을 골라 주세요." };
  if (items.length > 30) return { error: "한 번에 30개까지 등록할 수 있습니다." };

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("affiliate_products")
    .select("source_key, product_url")
    .eq("user_id", user.id)
    .eq("platform", "coupang");
  const registered = new Set((rows ?? []).map(coupangSourceKeyOf).filter((v): v is string => Boolean(v)));

  const toInsert = [];
  let skipped = 0;
  for (const item of items) {
    const sourceKey = String(item?.sourceKey ?? "").trim();
    const productName = String(item?.productName ?? "").trim().slice(0, 300);
    const productUrl = String(item?.productUrl ?? "").trim();
    if (!/^\d+$/.test(sourceKey) || !productName || !productUrl || registered.has(sourceKey)) { skipped++; continue; }
    if (!checkCoupangAffiliateLink(productUrl).ok) { skipped++; continue; }
    registered.add(sourceKey);
    const price = Number(item.price);
    const imageUrl = String(item?.imageUrl ?? "").trim();
    toInsert.push({
      user_id: user.id,
      platform: "coupang" as const,
      product_name: productName,
      product_url: productUrl,
      affiliate_url: productUrl,
      price: Number.isFinite(price) && price > 0 ? price : null,
      image_url: /^https:\/\//.test(imageUrl) ? imageUrl : null,
      input_mode: "url" as const,
      source_key: sourceKey,
    });
  }
  if (toInsert.length === 0) return { inserted: 0, skipped };
  const { error } = await supabase.from("affiliate_products").insert(toInsert);
  if (error) return { error: error.message };
  await logProgramUsage({ userId: user.id, action: "register_coupang_product_bulk" });
  revalidatePath("/products");
  return { inserted: toInsert.length, skipped };
}

export interface RegisterProductState {
  error?: string;
  success?: boolean;
  /** Registered, but something optional (e.g. the product image) could not be fetched. */
  warning?: string;
}

/**
 * 쿠팡 상품을 등록한다. productUrl은 이미 제휴 추적이 되는 링크라고 보고 그대로 저장한다.
 * - 검색 결과에서 고른 상품: 검색 API 자체가 본인 파트너스 키로 인증해서 받아온 결과라,
 *   productUrl이 이미 추적 링크(link.coupang.com/re/AFFSDP?...)다.
 * - "URL 직접 입력": 네이버 브랜드커넥트(registerNaverProductAction)와 동일하게, 사용자가
 *   쿠팡파트너스 사이트에서 직접 발급받은 본인 제휴 링크를 그대로 붙여넣는다는 전제다.
 *   그래서 API 키가 없어도(매출 15만원 미달로 API 키가 아직 활성화되지 않았어도) 등록할 수
 *   있다 — Access/Secret Key는 검색 API를 쓸 때만 필요하다.
 */
export async function registerCoupangProductAction(
  _prevState: RegisterProductState,
  formData: FormData,
): Promise<RegisterProductState> {
  const user = await requireProgramAccess();
  const productName = String(formData.get("productName") ?? "").trim();
  const productUrl = String(formData.get("productUrl") ?? "").trim();
  const priceRaw = String(formData.get("price") ?? "").trim();

  if (!productName || !productUrl) {
    return { error: "상품 정보가 올바르지 않습니다. 다시 검색해서 선택하거나 URL을 입력해주세요." };
  }
  // Same check as the form: a plain store URL would be saved as the "affiliate" link and earn nothing.
  const linkCheck = checkCoupangAffiliateLink(productUrl);
  if (!linkCheck.ok) return { error: COUPANG_LINK_MESSAGES[linkCheck.reason] };

  const supabase = await createClient();
  const enrichment = parseEnrichmentFields(formData);

  const { error } = await supabase.from("affiliate_products").insert({
    user_id: user.id,
    platform: "coupang",
    product_name: productName,
    product_url: productUrl,
    affiliate_url: productUrl,
    price: priceRaw ? Number(priceRaw) : null,
    // 검색 결과면 상품 번호, 직접 붙여넣은 단축 링크면 null — 「이미 등록한 상품 빼기」에 쓴다.
    source_key: coupangSourceKeyOf({ source_key: String(formData.get("sourceKey") ?? "").trim() || null, product_url: productUrl }),
    ...enrichment,
  });
  if (error) return { error: error.message };

  await logProgramUsage({ userId: user.id, action: "register_coupang_product" });
  revalidatePath("/products");
  return { success: true };
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
    // 1. 단축 URL 및 제휴 딥링크 입력 시 원본 item URL로 확정(resolve)
    const resolvedUrl = await resolveAliexpressUrl(productUrl);

    // 2. 제휴 링크 생성
    const [link] = await getPromotionLinks([resolvedUrl], {
      appKey,
      appSecret,
      trackingId,
    });
    if (!link?.promotionLink) {
      return { error: "제휴 링크 생성에 실패했습니다." };
    }

    const enrichment = parseEnrichmentFields(formData);

    // 3~4. 공식 API(빈도 제한 시 재시도) → 이 상품 페이지의 메타 이미지 순으로 썸네일 수집
    const extractedImage = enrichment.image_url
      ? normalizeImageUrl(enrichment.image_url)
      : await findAliexpressImage([resolvedUrl, productUrl], { appKey, appSecret, trackingId });

    const { error } = await supabase.from("affiliate_products").insert({
      user_id: user.id,
      platform: "aliexpress",
      product_name: productName,
      product_url: productUrl,
      affiliate_url: link.promotionLink,
      ...enrichment,
      image_url: extractedImage || enrichment.image_url || null,
    });
    if (error) return { error: error.message };

    await logProgramUsage({ userId: user.id, action: "register_aliexpress_product" });
    revalidatePath("/products");
    return extractedImage ? { success: true } : { success: true, warning: ALIEXPRESS_IMAGE_WARNING };
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

/**
 * Reads the Coupang Partners "이미지 + 텍스트 → 블로그용 태그" code
 * (<a href="https://link.coupang.com/a/..."><img src=".../affiliate/banner/..." alt="상품명"></a>):
 * link and name come from the code, and the product photo is cut out of the banner and stored in
 * post-images. Only coupangcdn.com banner URLs are fetched. The "일반태그" (coupa.ng) is refused because
 * coupa.ng blocks every cloud server (see src/lib/affiliate-clients/coupangBanner.ts).
 */
export async function importCoupangBlogTagAction(
  text: string,
): Promise<{ url?: string; name?: string; imageUrl?: string; error?: string }> {
  const user = await requireProgramAccess();
  if (extractCoupaNgUrl(text) && !/<a\b/i.test(text)) return { error: COUPANG_LINK_MESSAGES.widget_url };

  const parsed = parseCoupangShareCode(text);
  if (!parsed) return { error: "붙여넣은 내용에서 링크를 찾지 못했습니다." };
  const linkCheck = checkCoupangAffiliateLink(parsed.url);
  if (!linkCheck.ok) return { error: COUPANG_LINK_MESSAGES[linkCheck.reason] };

  let imageUrl = parsed.imageUrl;
  if (!imageUrl && parsed.bannerUrl) {
    try {
      const photo = await cropPhotoFromCoupangBanner(parsed.bannerUrl);
      if (photo) {
        const supabase = await createClient();
        const path = `${user.id}/products/coupang-${crypto.randomUUID()}.jpg`;
        const { error } = await supabase.storage
          .from("post-images")
          .upload(path, photo, { contentType: "image/jpeg", upsert: false });
        if (error) throw new Error(error.message);
        imageUrl = supabase.storage.from("post-images").getPublicUrl(path).data.publicUrl;
      }
    } catch (err) {
      console.warn("[coupang banner] photo import failed", err);
    }
  }
  return { url: parsed.url, name: parsed.name, imageUrl };
}

/** Fetch the image again for an AliExpress product saved without one (or with a broken one). */
export async function refreshAliexpressImageAction(productId: string): Promise<{ imageUrl?: string; error?: string }> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: product } = await supabase
    .from("affiliate_products")
    .select("id, product_url, affiliate_url")
    .eq("id", productId)
    .eq("user_id", user.id)
    .eq("platform", "aliexpress")
    .maybeSingle();
  if (!product) return { error: "상품을 찾을 수 없습니다." };

  const [appKey, appSecret, trackingId] = await Promise.all([
    resolveApiKey(supabase, user.id, "aliexpress_app_key"),
    resolveApiKey(supabase, user.id, "aliexpress_app_secret"),
    resolveApiKey(supabase, user.id, "aliexpress_tracking_id"),
  ]);
  if (!appKey || !appSecret || !trackingId) {
    return { error: "알리익스프레스 App Key/Secret/Tracking ID가 없습니다. 설정 페이지에서 먼저 등록해주세요." };
  }

  const resolvedUrl = await resolveAliexpressUrl(product.product_url ?? product.affiliate_url);
  const imageUrl = await findAliexpressImage(
    [resolvedUrl, product.product_url ?? "", product.affiliate_url].filter(Boolean),
    { appKey, appSecret, trackingId },
  );
  if (!imageUrl) return { error: "이번에도 이미지를 가져오지 못했습니다. 잠시 후 다시 시도해주세요." };

  const { error } = await supabase
    .from("affiliate_products")
    .update({ image_url: imageUrl })
    .eq("id", product.id)
    .eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/products");
  return { imageUrl };
}

// ─────────────────────────────────────────────────────────────────────────
// 토스쇼핑 쉐어링크 — 키워드 검색 API가 없어서(공식 문서 기준) 쿠팡/알리익스프레스와
// 달리 "베스트 상품/카테고리별/오늘의 특가" 중 하나를 골라 목록에서 상품을 선택하는
// 방식으로 등록한다. 선택 즉시 검색하지 않고, 등록 버튼을 누를 때만 쉐어링크(제휴
// 추적 링크)를 발급해서 API 발급 한도(일 1만 건)를 아낀다.
// ─────────────────────────────────────────────────────────────────────────

async function resolveTossAuth(userId: string, supabase: Awaited<ReturnType<typeof createClient>>) {
  const [accessKey, secretKey, publisherId] = await Promise.all([
    resolveApiKey(supabase, userId, "toss_access_key"),
    resolveApiKey(supabase, userId, "toss_secret_key"),
    resolveApiKey(supabase, userId, "toss_publisher_id"),
  ]);
  if (!accessKey || !secretKey || !publisherId) return null;
  return { accessKey, secretKey, publisherId };
}

export interface BrowseTossState {
  products?: TossProduct[];
  categories?: TossCategory[];
  error?: string;
}

/** 토스 쉐어링크 상품 목록을 불러온다. mode에 따라 베스트/카테고리별/오늘의 특가 중 하나. */
export async function browseTossProductsAction(
  mode: "best" | "category" | "today",
  categoryId?: string,
): Promise<BrowseTossState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const auth = await resolveTossAuth(user.id, supabase);
  if (!auth) {
    return { error: "토스쇼핑 쉐어링크 Access Key/Secret Key/Publisher ID가 없습니다. 설정 페이지에서 먼저 등록해주세요." };
  }

  try {
    if (mode === "best") {
      const { products } = await getBestSelling(auth, { size: 30 });
      return { products };
    }
    if (mode === "today") {
      const { products } = await getTodayDeals(auth, { size: 30 });
      return { products };
    }
    if (!categoryId) return { error: "카테고리를 먼저 선택해주세요." };
    const { products } = await getCategoryBestSelling(auth, categoryId, { size: 30 });
    return { products };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "토스 쉐어링크 상품 조회에 실패했습니다." };
  }
}

/** 카테고리 목록만 별도로 불러온다(하루 정도 캐시해서 재사용 권장 — 우선은 매번 조회). */
export async function fetchTossCategoriesAction(): Promise<BrowseTossState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const auth = await resolveTossAuth(user.id, supabase);
  if (!auth) {
    return { error: "토스쇼핑 쉐어링크 Access Key/Secret Key/Publisher ID가 없습니다. 설정 페이지에서 먼저 등록해주세요." };
  }

  try {
    const categories = await getCategories(auth);
    return { categories };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "토스 쉐어링크 카테고리 조회에 실패했습니다." };
  }
}

/** 선택한 토스쇼핑 상품의 쉐어링크(제휴 추적 링크)를 발급해서 등록한다. */
export async function registerTossProductAction(
  _prevState: RegisterProductState,
  formData: FormData,
): Promise<RegisterProductState> {
  const user = await requireProgramAccess();
  const productName = String(formData.get("productName") ?? "").trim();
  const tacaIdRaw = String(formData.get("tacaId") ?? "").trim();
  const tacaItemIdRaw = String(formData.get("tacaItemId") ?? "").trim();
  const imageUrl = String(formData.get("imageUrl") ?? "").trim();
  const priceRaw = String(formData.get("price") ?? "").trim();

  if (!productName || (!tacaIdRaw && !tacaItemIdRaw)) {
    return { error: "상품 정보가 올바르지 않습니다. 다시 목록에서 선택해주세요." };
  }

  const supabase = await createClient();
  const auth = await resolveTossAuth(user.id, supabase);
  if (!auth) {
    return { error: "토스쇼핑 쉐어링크 Access Key/Secret Key/Publisher ID가 없습니다. 설정 페이지에서 먼저 등록해주세요." };
  }

  try {
    // subTagId는 넘기면 안 된다 — 토스 API 문서(2026-09-10 확인) 기준 subTagId는
    // POST /openapi/sub-tags/create로 미리 등록해둔 값만 쓸 수 있고, 등록 안 된 값을
    // 보내면 SHARELINK_OPENAPI_ACCESS_DENIED("접근 권한이 없습니다")로 거부된다.
    // 예전엔 회원 user_id를 그냥 subTagId로 써도 되는 줄 알고 자동으로 채워 보냈던 것이
    // 원인이었다. subTagId는 선택 필드라 생략하면 정상 발급된다 — 회원별 서브채널 실적
    // 분리 추적이 필요해지면 그때 sub-tags/create로 사전 등록하는 흐름을 별도로 구현할 것.
    const link = await issueShareLink(auth, {
      tacaItemId: tacaItemIdRaw ? Number(tacaItemIdRaw) : undefined,
      tacaId: tacaIdRaw ? Number(tacaIdRaw) : undefined,
    });

    const enrichment = parseEnrichmentFields(formData);

    const { error } = await supabase.from("affiliate_products").insert({
      user_id: user.id,
      platform: "toss",
      product_name: productName,
      product_url: link.originUrl,
      affiliate_url: link.shortUrl,
      price: priceRaw ? Number(priceRaw) : null,
      ...enrichment,
      image_url: enrichment.image_url ?? (imageUrl || null),
    });
    if (error) return { error: error.message };

    await logProgramUsage({ userId: user.id, action: "register_toss_product" });
    revalidatePath("/products");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "토스 쉐어링크 발급에 실패했습니다." };
  }
}
