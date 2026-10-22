import "server-only";
import crypto from "node:crypto";

// 공용 기준 코드 `affiliate-clients` — 쿠팡 파트너스 오픈 API(상품 검색·딥링크). 서버 전용(Access/Secret Key가 브라우저로 가지 않음).
// 기준: threads-affiliate-poster/src/lib/affiliate-clients/ · 사본: threads-content-ops/lib/affiliate-clients/ (사본 직접 수정 금지, --sync)
// 키는 항상 회원 본인의 user_api_keys 값만 쓴다(운영자 키 폴백 금지 — 호출부).
//
// 2026-09-11 실계정 실호출로 서명·엔드포인트 검증. 검색 API가 주는 productUrl은 이미 본인 파트너스 키로 추적되는
// 제휴 링크(link.coupang.com/re/AFFSDP?...)라 그대로 저장한다(이미 변환된 링크를 딥링크로 다시 바꾸면 400).

const API_GATEWAY = "https://api-gateway.coupang.com";
const SEARCH_PATH = "/v2/providers/affiliate_open_api/apis/openapi/products/search";
const DEEPLINK_PATH = "/v2/providers/affiliate_open_api/apis/openapi/v1/deeplink";

export type CoupangAuth = { accessKey: string; secretKey: string };

export interface CoupangProduct {
  productId: number;
  productName: string;
  productImage: string;
  productPrice: number;
  productUrl: string;
  isRocket: boolean;
  isFreeShipping: boolean;
}

/**
 * "Specified key is not registered."(401)는 서명 오류가 아니라, 쿠팡 파트너스 계정의 누적 매출이 15만원을 넘기 전까지
 * API 키가 활성화되지 않아서 나는 정상 대기 상태다. 재발급·코드 문제로 오해하지 않도록 원인을 그대로 안내한다.
 */
function buildCoupangErrorMessage(action: string, status: number, body: string): string {
  if (status === 401 && body.includes("Specified key is not registered")) {
    return `쿠팡 ${action}에 실패했습니다. 쿠팡 파트너스 API 키가 아직 활성화되지 않았습니다 — 쿠팡 파트너스는 계정의 누적 매출이 15만원을 넘어야 API 키를 활성화해 줍니다. 그 전에는 파트너스 사이트에서 만든 제휴 링크를 직접 붙여넣어 등록해 주세요.`;
  }
  if (status === 401) return `쿠팡 ${action}에 실패했습니다. 쿠팡 파트너스 Access Key / Secret Key를 확인해 주세요. API키등록·플랫폼연동에서 두 값을 다시 저장해 보세요.`;
  if (status === 429) return `쿠팡 ${action}에 실패했습니다. 쿠팡 파트너스 호출 한도에 도달했습니다(검색은 시간당 10회). 잠시 뒤 다시 시도해 주세요.`;
  return `쿠팡 ${action}에 실패했습니다. (${status}) ${body.slice(0, 200)}`;
}

/**
 * 쿠팡 파트너스 API 서명(HMAC-SHA256, "CEA" 인증 스킴), signed-date 형식 yyMMdd'T'HHmmss'Z'(UTC).
 * 서명 대상 문자열은 signedDate + method + path + query를 그대로 이은 것이다 — path와 query 사이에 "?"를 넣지 않는다
 * (넣으면 "Invalid signature" 401, 2026-09-11 실계정 확인. 실제 요청 주소에는 "?"가 필요하다).
 */
export function buildCoupangAuthorization(method: "GET" | "POST", path: string, query: string, auth: CoupangAuth, now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const signedDate =
    `${String(now.getUTCFullYear()).slice(2)}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}` +
    `T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
  const signature = crypto.createHmac("sha256", auth.secretKey).update(`${signedDate}${method}${path}${query}`).digest("hex");
  return `CEA algorithm=HmacSHA256, access-key=${auth.accessKey}, signed-date=${signedDate}, signature=${signature}`;
}

/** 검색 결과 상품에서 일반 쿠팡 상품 상세 주소(https://www.coupang.com/vp/products/{productId})를 만든다. */
export function buildProductDetailUrl(product: { productId: number | string; productUrl?: string }): string {
  const productId = String(product.productId ?? "").trim();
  if (!/^\d+$/.test(productId)) return "";
  let source: URL | undefined;
  try { source = new URL(String(product.productUrl ?? "")); } catch { /* 주소가 없거나 잘못되면 번호만으로 만든다 */ }
  const value = (name: string): string => {
    const direct = String((product as Record<string, unknown>)[name] ?? "").trim();
    const fromUrl = source?.searchParams.get(name)?.trim() ?? "";
    return /^\d+$/.test(direct) ? direct : /^\d+$/.test(fromUrl) ? fromUrl : "";
  };
  const url = new URL(`https://www.coupang.com/vp/products/${productId}`);
  const itemId = value("itemId");
  const vendorItemId = value("vendorItemId");
  if (itemId) url.searchParams.set("itemId", itemId);
  if (vendorItemId) url.searchParams.set("vendorItemId", vendorItemId);
  return url.toString();
}

/** link.coupang.com/a/... 형태의 공식 단축 링크인지 확인한다. */
export function isCoupangShortUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && !url.username && !url.password && !url.port
      && url.hostname.toLowerCase() === "link.coupang.com" && /^\/a\/[^/]+\/?$/i.test(url.pathname);
  } catch {
    return false;
  }
}

/** 딥링크 API로 일반 쿠팡 상품 주소를 공식 단축 링크(link.coupang.com/a/...)로 바꾼다. */
export async function createCoupangDeeplink(coupangUrls: string[], auth: CoupangAuth, subId?: string): Promise<string[]> {
  if (!coupangUrls.length) return [];
  const response = await fetch(`${API_GATEWAY}${DEEPLINK_PATH}`, {
    method: "POST",
    headers: { Authorization: buildCoupangAuthorization("POST", DEEPLINK_PATH, "", auth), "Content-Type": "application/json" },
    body: JSON.stringify({ coupangUrls, ...(subId ? { subId } : {}) }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(buildCoupangErrorMessage("단축 링크 생성", response.status, await response.text()));
  const data = (await response.json()) as { rCode?: string; rMessage?: string; data?: Array<{ shortenUrl?: string }> };
  if (data.rCode && data.rCode !== "0") throw new Error(`쿠팡 단축 링크 생성 실패: ${data.rMessage ?? data.rCode}`);
  return (data.data ?? []).map((item) => String(item.shortenUrl ?? "").trim()).filter(Boolean);
}

/** 키워드로 상품 검색. 검색 API는 키워드당 최대 10개·시간당 10회 제한이 있어 호출부가 결과를 화면에 유지해 재검색을 줄인다. */
export async function searchCoupangProducts(keyword: string, auth: CoupangAuth & { limit?: number }): Promise<CoupangProduct[]> {
  const query = new URLSearchParams({ keyword, limit: String(auth.limit ?? 10) }).toString();
  const response = await fetch(`${API_GATEWAY}${SEARCH_PATH}?${query}`, {
    method: "GET",
    headers: { Authorization: buildCoupangAuthorization("GET", SEARCH_PATH, query, auth), "Content-Type": "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(buildCoupangErrorMessage("상품 검색", response.status, await response.text()));
  const data = (await response.json()) as {
    rCode?: string;
    rMessage?: string;
    data?: { productData?: Array<{
      productId: number; productName: string; productImage: string; productPrice: number;
      productUrl: string; isRocket?: boolean; isFreeShipping?: boolean;
    }> };
  };
  if (data.rCode && data.rCode !== "0") throw new Error(`쿠팡 상품 검색 응답 오류: ${data.rMessage ?? data.rCode}`);
  return (data.data?.productData ?? []).map((p) => ({
    productId: p.productId,
    productName: p.productName,
    productImage: p.productImage,
    productPrice: p.productPrice,
    productUrl: p.productUrl,
    isRocket: Boolean(p.isRocket),
    isFreeShipping: Boolean(p.isFreeShipping),
  }));
}
