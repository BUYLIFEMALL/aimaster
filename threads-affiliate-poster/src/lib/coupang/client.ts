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
 * "Specified key is not registered."(401)는 서명/코드 오류가 아니라, 쿠팡파트너스 계정의
 * 누적 매출이 15만원을 넘기 전까지 API 키 자체가 활성화되지 않아서 나는 정상적인 대기
 * 상태다(AGENTS.md에 2026-09-01 확인 기록, 여러 날짜에 재현해도 서명 로직은 항상 정상
 * 작동했음). 이 문구를 감지하면 재발급/코드 문제로 오해하지 않도록 원인을 그대로 안내한다.
 */
function buildCoupangErrorMessage(action: string, status: number, body: string): string {
  if (status === 401 && body.includes("Specified key is not registered")) {
    return (
      `쿠팡 ${action}에 실패했습니다. (401) 쿠팡파트너스 API 키가 아직 활성화되지 않았습니다 — ` +
      `쿠팡파트너스는 계정의 누적 매출이 15만원을 넘어야 API 키를 활성화해줍니다. 키를 다시 ` +
      `발급받거나 코드를 수정해야 하는 문제가 아니라, 매출 요건을 채우면 자동으로 해결됩니다.`
    );
  }
  return `쿠팡 ${action}에 실패했습니다. (${status}) ${body.slice(0, 300)}`;
}

/**
 * 쿠팡파트너스 API 서명(HMAC-SHA256, "CEA" 인증 스킴).
 * signed-date 형식: yyMMdd'T'HHmmss'Z' (UTC).
 *
 * 서명 대상 문자열은 signedDate + method + path + query 네 요소를 그대로 이어붙인 것이다 —
 * 공식 문서(developers.coupang.com/ko/getting-started/creating-hmac-signature)의 PHP/Python
 * 예제 전부 `$message = $datetime.$method.$path.$query;` 형태로, path와 query 사이에
 * "?" 문자가 들어가지 않는다. 실제 HTTP 요청 URL에는 "?"가 필요하지만(query string 구분자),
 * 서명 계산에는 넣으면 안 된다 — 2026-09-11 실계정 첫 실호출에서 "Invalid signature"(401)로
 * 이 차이를 확인했다(이전엔 계정 매출 요건 미달로 서명 검증 자체를 못 받아봤다).
 */
function buildAuthorizationHeader(
  method: "GET" | "POST",
  path: string,
  query: string,
  auth: CoupangAuthParams,
): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const signedDate =
    `${String(now.getUTCFullYear()).slice(2)}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}` +
    `T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

  const message = `${signedDate}${method}${path}${query}`;
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
  const query = params.toString();

  const response = await fetch(`${API_GATEWAY}${SEARCH_PATH}?${query}`, {
    method: "GET",
    headers: {
      Authorization: buildAuthorizationHeader("GET", SEARCH_PATH, query, auth),
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(buildCoupangErrorMessage("상품 검색", response.status, body));
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
      Authorization: buildAuthorizationHeader("POST", DEEPLINK_PATH, "", auth),
      "Content-Type": "application/json",
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(buildCoupangErrorMessage("딥링크 생성", response.status, text));
  }

  const data = (await response.json()) as {
    rCode?: string;
    rMessage?: string;
    data?: { originalUrl: string; shortenUrl: string; landingUrl: string }[];
  };
  // TEMP DEBUG(2026-09-11): "url convert failed" 원인 파악용 — 확인 후 제거할 것.
  console.log("[coupang-debug] deeplink request urls:", JSON.stringify(coupangUrls));
  console.log("[coupang-debug] deeplink response:", JSON.stringify(data).slice(0, 1000));

  if (data.rCode && data.rCode !== "0") {
    throw new Error(`쿠팡 딥링크 생성 응답 오류: ${data.rMessage ?? data.rCode}`);
  }

  return data.data ?? [];
}
