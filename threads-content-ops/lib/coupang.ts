import "server-only";
import crypto from "node:crypto";

// 쿠팡 파트너스 오픈 API 검색 클라이언트 + 제휴 링크 검사.
// `threads-affiliate-poster/src/lib/coupang/{client,links}.ts`(2026-09-11 실계정 실호출 검증 완료)의
// 서명·엔드포인트·오류 해석을 그대로 옮겼다. 그 폴더는 다른 프로그램이라 import하지 않고 복사한다
// (별도 프로젝트의 `@/` 경로 별칭이 루트와 달라 직접 import하면 깨진다). 규격이 바뀌면 두 곳을 같이 고칠 것.
//
// 키는 항상 회원 본인의 user_api_keys 값만 쓴다(운영자 키 폴백 금지, 호출부 web-actions.ts).

const API_GATEWAY = "https://api-gateway.coupang.com";
const SEARCH_PATH = "/v2/providers/affiliate_open_api/apis/openapi/products/search";
const DEEPLINK_PATH = "/v2/providers/affiliate_open_api/apis/openapi/v1/deeplink";

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
 * "Specified key is not registered."(401)는 서명 오류가 아니라, 쿠팡파트너스 계정의 누적 매출이
 * 15만원을 넘기 전까지 API 키가 활성화되지 않아서 나는 정상 대기 상태다(쇼핑제휴 자동화 AGENTS.md 확인).
 */
function buildCoupangErrorMessage(status: number, body: string): string {
  if (status === 401 && body.includes("Specified key is not registered")) {
    return "쿠팡 파트너스 API 키가 아직 활성화되지 않았습니다. 쿠팡 파트너스는 계정의 누적 매출이 15만원을 넘어야 API 키를 활성화해 줍니다. 그 전에는 파트너스 사이트에서 만든 제휴 링크를 아래 '새 소스 등록'에 직접 붙여넣어 등록해 주세요.";
  }
  if (status === 401) {
    return "쿠팡 파트너스 Access Key / Secret Key를 확인해 주세요. API키등록·플랫폼연동에서 두 값을 다시 저장해 보세요.";
  }
  if (status === 429) {
    return "쿠팡 파트너스 검색 한도에 도달했습니다. 검색은 시간당 10회까지라 잠시 뒤 다시 시도해 주세요.";
  }
  return `쿠팡 상품 검색에 실패했습니다. (${status}) ${body.slice(0, 200)}`;
}

/**
 * 쿠팡파트너스 API 서명(HMAC-SHA256, "CEA" 인증 스킴), signed-date 형식 yyMMdd'T'HHmmss'Z'(UTC).
 * 서명 대상 문자열은 signedDate + method + path + query를 그대로 이은 것이다 — path와 query 사이에
 * "?"를 넣지 않는다(넣으면 "Invalid signature" 401, 2026-09-11 실계정 확인).
 */
function buildAuthorizationHeader(method: "GET" | "POST", path: string, query: string, accessKey: string, secretKey: string): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const signedDate =
    `${String(now.getUTCFullYear()).slice(2)}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}` +
    `T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
  const message = `${signedDate}${method}${path}${query}`;
  const signature = crypto.createHmac("sha256", secretKey).update(message).digest("hex");
  return `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${signedDate}, signature=${signature}`;
}

/** 검색 결과 상품 객체에서 일반 쿠팡 상품 상세 URL(https://www.coupang.com/vp/products/{productId})을 추출/생성 */
export function buildProductDetailUrl(product: { productId: number | string; productUrl?: string }): string {
  const productId = String(product.productId ?? "").trim();
  if (!/^\d+$/.test(productId)) return "";
  let source: URL | undefined;
  try {
    source = new URL(String(product.productUrl ?? ""));
  } catch {}
  const value = (name: string): string => {
    const direct = String((product as any)[name] ?? "").trim();
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

/** link.coupang.com/a/... 유효한 단축 링크인지 검증 */
export function isCoupangShortUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const url = new URL(value.trim());
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      url.hostname.toLowerCase() === "link.coupang.com" &&
      /^\/a\/[^/]+\/?$/i.test(url.pathname)
    );
  } catch {
    return false;
  }
}

/** 쿠팡 파트너스 딥링크 생성 API를 호출하여 일반 쿠팡 상품 URL을 34자 공식 단축 링크(link.coupang.com/a/...)로 자동 변환 */
export async function createCoupangDeeplink(
  coupangUrls: string[],
  auth: { accessKey: string; secretKey: string },
  subId?: string
): Promise<string[]> {
  if (!coupangUrls.length) return [];
  const body = { coupangUrls, ...(subId ? { subId } : {}) };
  const response = await fetch(`${API_GATEWAY}${DEEPLINK_PATH}`, {
    method: "POST",
    headers: {
      Authorization: buildAuthorizationHeader("POST", DEEPLINK_PATH, "", auth.accessKey, auth.secretKey),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(buildCoupangErrorMessage(response.status, await response.text()));
  }

  const data = (await response.json()) as {
    rCode?: string;
    rMessage?: string;
    data?: Array<{ originalUrl?: string; shortenUrl?: string; landingUrl?: string }>;
  };

  if (data.rCode && data.rCode !== "0") {
    throw new Error(`쿠팡 단축 링크 생성 실패: ${data.rMessage ?? data.rCode}`);
  }

  const results: string[] = [];
  for (const item of data.data ?? []) {
    if (isCoupangShortUrl(item.shortenUrl)) {
      results.push(item.shortenUrl.trim());
    } else if (item.shortenUrl) {
      results.push(item.shortenUrl.trim());
    }
  }

  return results;
}

/** 키워드로 상품 검색. 검색 API는 키워드당 최대 10개·시간당 10회 제한이 있어 호출부가 결과를 화면에 유지해 재검색을 줄인다. */
export async function searchCoupangProducts(
  keyword: string,
  auth: { accessKey: string; secretKey: string; limit?: number },
): Promise<CoupangProduct[]> {
  const query = new URLSearchParams({ keyword, limit: String(auth.limit ?? 10) }).toString();
  const response = await fetch(`${API_GATEWAY}${SEARCH_PATH}?${query}`, {
    method: "GET",
    headers: {
      Authorization: buildAuthorizationHeader("GET", SEARCH_PATH, query, auth.accessKey, auth.secretKey),
      "Content-Type": "application/json",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) throw new Error(buildCoupangErrorMessage(response.status, await response.text()));

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

// ---------------------------------------------------------------------------
// 제휴 링크 검사 — 쿠팡 파트너스는 추적 링크로만 수수료를 준다. 일반 쇼핑 주소는 수수료가 0이라 거부한다.
//   허용: link.coupang.com/a/...(링크 생성기), link.coupang.com/re/AFFSDP?...(검색 API),
//         *.coupang.com/...?lptag=AF...(제휴 링크가 이동한 최종 주소)
// ---------------------------------------------------------------------------
export type CoupangLinkCheck = { ok: true } | { ok: false; reason: "invalid" | "not_coupang" | "plain_store_url" | "widget_url" };

export function checkCoupangAffiliateLink(raw: string): CoupangLinkCheck {
  let url: URL;
  try { url = new URL(raw.trim()); } catch { return { ok: false, reason: "invalid" }; }
  const host = url.hostname.toLowerCase();
  if (host === "link.coupang.com") return { ok: true };
  if (host === "coupa.ng") return { ok: false, reason: "widget_url" };
  if (host === "coupang.com" || host.endsWith(".coupang.com")) {
    return /^AF/i.test(url.searchParams.get("lptag") ?? "") ? { ok: true } : { ok: false, reason: "plain_store_url" };
  }
  return { ok: false, reason: "not_coupang" };
}

export const COUPANG_LINK_MESSAGES: Record<Exclude<CoupangLinkCheck, { ok: true }>["reason"], string> = {
  invalid: "올바른 링크 형식이 아닙니다. https:// 로 시작하는 전체 링크를 붙여넣어 주세요.",
  not_coupang: "쿠팡 링크가 아닙니다. 쿠팡 파트너스에서 만든 링크(link.coupang.com/...)를 넣어 주세요.",
  plain_store_url: "일반 쿠팡 쇼핑 주소라서 수수료가 잡히지 않습니다. 쿠팡 파트너스 사이트(partners.coupang.com)의 [링크 생성]에서 만든 링크(link.coupang.com/a/...)를 넣어 주세요.",
  widget_url: "\"일반태그\"(iframe) 주소(coupa.ng)는 게시용 링크가 아닙니다. 같은 화면에서 만든 link.coupang.com 링크를 넣어 주세요.",
};

/** 상품 사진은 쿠팡 CDN(https)만 저장·표시한다. */
export function isCoupangImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && /(^|\.)coupangcdn\.com$/i.test(url.hostname);
  } catch {
    return false;
  }
}
