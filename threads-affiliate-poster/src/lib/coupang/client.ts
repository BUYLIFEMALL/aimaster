import "server-only";
import crypto from "crypto";

// 쿠팡파트너스 오픈 API 클라이언트. "server-only" 가드로 Access/Secret Key가
// 클라이언트 번들에 절대 포함되지 않도록 한다.
//
// 참고: 아래 엔드포인트/서명 방식은 커뮤니티 SDK(mooooburg-dev/coupang-partners-sdk-standalone)
// README와 여러 개발 블로그에서 공통적으로 확인한 구조를 재현한 것이다. 공식 문서
// (https://partners.coupang.com → API 신청 후 제공되는 가이드 PDF)에서 실제 계정으로
// 검증하지는 못했으니, 사용자가 API 키를 발급받아 첫 연동을 시도할 때 응답 오류가 나면
// 이 파일의 엔드포인트/서명 로직을 공식 가이드와 다시 대조해야 한다.

const API_GATEWAY = "https://api-gateway.coupang.com";
const DEEPLINK_PATH = "/v2/providers/affiliate_open_api/apis/openapi/v1/deeplink";
const SEARCH_PATH = "/v2/providers/affiliate_open_api/apis/openapi/products/search";

interface CoupangAuthParams {
  accessKey: string;
  secretKey: string;
}

/**
 * 쿠팡파트너스 API 서명(HMAC-SHA256, "CEA" 인증 스킴).
 * signed-date 형식: yyMMdd'T'HHmmss'Z' (UTC), 서명 대상 문자열: signedDate + method + path(+쿼리스트링).
 */
function buildAuthorizationHeader(
  method: "GET" | "POST",
  pathWithQuery: string,
  auth: CoupangAuthParams,
): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const signedDate =
    `${String(now.getUTCFullYear()).slice(2)}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}` +
    `T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

  const message = `${signedDate}${method}${pathWithQuery}`;
  const signature = crypto.createHmac("sha256", auth.secretKey).update(message).digest("hex");

  return `CEA algorithm=HmacSHA256, access-key=${auth.accessKey}, signed-date=${signedDate}, signature=${signature}`;
}

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
 * 키워드로 상품을 검색한다. 쿠팡파트너스 검색 API는 시간당 10회 호출 제한이 있다고
 * 알려져 있으므로(공식 수치 재확인 필요), 호출부에서 결과를 캐시해서 재검색을 줄여야 한다.
 */
export async function searchProducts(
  keyword: string,
  auth: CoupangAuthParams & { limit?: number },
): Promise<CoupangProduct[]> {
  const params = new URLSearchParams({ keyword, limit: String(auth.limit ?? 10) });
  const pathWithQuery = `${SEARCH_PATH}?${params.toString()}`;

  const response = await fetch(`${API_GATEWAY}${pathWithQuery}`, {
    method: "GET",
    headers: {
      Authorization: buildAuthorizationHeader("GET", pathWithQuery, auth),
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`쿠팡 상품 검색에 실패했습니다. (${response.status}) ${body.slice(0, 300)}`);
  }

  const data = (await response.json()) as {
    rCode?: string;
    rMessage?: string;
    data?: {
      productData?: {
        productId: number;
        productName: string;
        productImage: string;
        productPrice: number;
        productUrl: string;
        isRocket?: boolean;
        isFreeShipping?: boolean;
      }[];
    };
  };

  if (data.rCode && data.rCode !== "0") {
    throw new Error(`쿠팡 상품 검색 응답 오류: ${data.rMessage ?? data.rCode}`);
  }

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

export interface CoupangDeeplink {
  originalUrl: string;
  shortenUrl: string;
  landingUrl: string;
}

/** 쿠팡 상품 URL을 파트너스 제휴 딥링크로 변환한다(최대 여러 개 한 번에 처리 가능). */
export async function createDeeplink(
  coupangUrls: string[],
  auth: CoupangAuthParams & { subId?: string },
): Promise<CoupangDeeplink[]> {
  const body = JSON.stringify({
    coupangUrls,
    ...(auth.subId ? { subId: auth.subId } : {}),
  });

  const response = await fetch(`${API_GATEWAY}${DEEPLINK_PATH}`, {
    method: "POST",
    headers: {
      Authorization: buildAuthorizationHeader("POST", DEEPLINK_PATH, auth),
      "Content-Type": "application/json",
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`쿠팡 딥링크 생성에 실패했습니다. (${response.status}) ${text.slice(0, 300)}`);
  }

  const data = (await response.json()) as {
    rCode?: string;
    rMessage?: string;
    data?: { originalUrl: string; shortenUrl: string; landingUrl: string }[];
  };

  if (data.rCode && data.rCode !== "0") {
    throw new Error(`쿠팡 딥링크 생성 응답 오류: ${data.rMessage ?? data.rCode}`);
  }

  return data.data ?? [];
}
