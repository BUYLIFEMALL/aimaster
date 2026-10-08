import "server-only";
import crypto from "crypto";

// 알리익스프레스 Affiliate API(TOP) 클라이언트 — threads-affiliate-poster/src/lib/aliexpress/client.ts와
// 상품 등록 흐름(products.ts의 findAliexpressImage·tryFetchOgImage)을 이 프로그램으로 옮긴 것이다(v1.79).
// 회원 본인의 App Key/Secret/Tracking ID(user_api_keys)로만 호출한다. 단축 링크 → 원본 주소 확정 → 제휴 링크 생성 →
// 공식 API(빈도 제한 시 재시도) → 상품 페이지 메타 이미지 순으로 썸네일을 찾는다.

const GATEWAY = "https://api-sg.aliexpress.com/sync";

export type AliexpressAuth = { appKey: string; appSecret: string; trackingId: string };

/** TOP API 표준 서명: 정렬된 key+value를 이어붙인 문자열의 앞뒤에 secret을 붙여 MD5(대문자 hex). */
function signParams(params: Record<string, string>, appSecret: string): string {
  const base = Object.keys(params).sort().map((key) => `${key}${params[key]}`).join("");
  return crypto.createHash("md5").update(`${appSecret}${base}${appSecret}`, "utf8").digest("hex").toUpperCase();
}

class AliexpressApiError extends Error {
  constructor(message: string, readonly code?: string) { super(message); }
}

// 제휴 API는 앱 키 단위로 호출 빈도를 제한한다(`ApiCallLimit`, 1초 안팎). 일시적이므로 기다렸다가 다시 시도한다.
const RATE_LIMIT_RETRY_DELAYS_MS = [1200, 2500, 4000];

async function callTopApi(method: string, bizParams: Record<string, string>, auth: AliexpressAuth): Promise<Record<string, unknown>> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await callTopApiOnce(method, bizParams, auth);
    } catch (err) {
      const delay = RATE_LIMIT_RETRY_DELAYS_MS[attempt];
      if (!(err instanceof AliexpressApiError) || err.code !== "ApiCallLimit" || delay === undefined) throw err;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

async function callTopApiOnce(method: string, bizParams: Record<string, string>, auth: AliexpressAuth): Promise<Record<string, unknown>> {
  const params: Record<string, string> = {
    app_key: auth.appKey, method, timestamp: String(Date.now()), sign_method: "md5", format: "json", v: "2.0", ...bizParams,
  };
  params.sign = signParams(params, auth.appSecret);

  const response = await fetch(GATEWAY, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
  });
  if (!response.ok) throw new Error(`알리익스프레스 API 요청이 실패했습니다. (${response.status})`);

  const data = (await response.json()) as Record<string, unknown> & { error_response?: { code?: string; msg?: string; sub_msg?: string } };
  if (data.error_response) {
    throw new AliexpressApiError(`알리익스프레스 API 오류: ${data.error_response.sub_msg ?? data.error_response.msg ?? "알 수 없는 오류"}`, data.error_response.code);
  }
  return data;
}

/** 상품 주소를 제휴 링크로 바꾼다(aliexpress.affiliate.link.generate). 못 만들면 null. */
export async function createAliexpressPromotionLink(productUrl: string, auth: AliexpressAuth): Promise<string | null> {
  const data = await callTopApi("aliexpress.affiliate.link.generate", {
    source_values: productUrl, promotion_link_type: "0", tracking_id: auth.trackingId,
  }, auth);
  const result = data["aliexpress_affiliate_link_generate_response"] as
    | { resp_result?: { result?: { promotion_links?: { promotion_link?: { promotion_link?: string }[] } } } }
    | undefined;
  return result?.resp_result?.result?.promotion_links?.promotion_link?.find((link) => link.promotion_link)?.promotion_link ?? null;
}

/** 모바일 공유 단축 주소(a.aliexpress.com/_…)를 원본 item 주소로 확정한다. 실패하면 입력값 그대로. */
export async function resolveAliexpressUrl(url: string): Promise<string> {
  const trimmed = url.trim();
  if (!trimmed || /item\/\d+\.html/i.test(trimmed)) return trimmed;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(trimmed, {
      method: "GET", redirect: "follow", signal: controller.signal,
      headers: { "User-Agent": BROWSER_UA, "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7" },
    });
    clearTimeout(timeoutId);
    if (res.url && res.url !== trimmed) return res.url;
  } catch { /* 확정하지 못하면 입력값을 그대로 쓴다 */ }
  return trimmed;
}

export function extractAliexpressProductId(url: string): string | null {
  if (!url) return null;
  let decoded = url;
  try { decoded = decodeURIComponent(url); } catch { /* 잘못된 인코딩은 원문 그대로 */ }
  const match = decoded.match(/item\/(\d+)\.html/i) || decoded.match(/\/(\d+)\.html/i) || decoded.match(/productId=(\d+)/i)
    || decoded.match(/product\/(\d+)/i) || decoded.match(/(\d{10,18})/);
  return match ? match[1] : null;
}

const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

export function normalizeImageUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (trimmed.startsWith("http://")) return trimmed.replace("http://", "https://");
  return trimmed;
}

async function getProductImage(productId: string, auth: AliexpressAuth): Promise<string | null> {
  try {
    const data = await callTopApi("aliexpress.affiliate.productdetail.get", {
      product_ids: productId, tracking_id: auth.trackingId, target_currency: "KRW", target_language: "KO",
    }, auth);
    const result = data["aliexpress_affiliate_productdetail_get_response"] as
      | { resp_result?: { result?: { products?: { product?: Array<{ product_main_image_url?: string; product_small_image_urls?: { string?: string[] } }> } } } }
      | undefined;
    const product = result?.resp_result?.result?.products?.product?.[0];
    const image = product?.product_main_image_url || product?.product_small_image_urls?.string?.[0];
    return image ? normalizeImageUrl(image) : null;
  } catch {
    return null;
  }
}

/** 이 상품 페이지의 메타 이미지. 차단/랜딩 페이지의 공용 이미지를 상품 사진으로 저장하지 않도록 이 상품의 페이지일 때만 받아들인다. */
async function tryFetchOgImage(url: string, productId?: string | null): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": BROWSER_UA, "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7", Cookie: "aep_usuc_f=site=kor&c_tp=KRW&region=KR; intl_locale=ko_KR;" },
    });
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    const html = await res.text();
    if (productId && !html.includes(productId)) return null;
    const match = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i)
      || html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/"product_main_image_url"\s*:\s*"([^"]+)"/i);
    return match ? normalizeImageUrl(match[1].replace(/\\/g, "")) : null;
  } catch {
    return null;
  }
}

/** 공식 productdetail API(빈도 제한 시 재시도) → 상품 페이지 메타 이미지 순으로 썸네일을 찾는다. */
export async function findAliexpressImage(urls: string[], auth: AliexpressAuth): Promise<string | null> {
  const productId = urls.map((url) => extractAliexpressProductId(url)).find(Boolean) ?? null;
  if (productId) {
    const image = await getProductImage(productId, auth);
    if (image) return image;
  }
  for (const url of urls) {
    const image = await tryFetchOgImage(url, productId);
    if (image) return image;
  }
  return null;
}

export const ALIEXPRESS_IMAGE_WARNING = "상품은 등록됐지만 알리익스프레스에서 상품 이미지를 가져오지 못했습니다. 잠시 후 목록의 \"이미지 다시 가져오기\"를 눌러 주세요.";
