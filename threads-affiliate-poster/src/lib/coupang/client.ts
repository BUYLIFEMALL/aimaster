import "server-only";
import crypto from "crypto";

// 쿠팡파트너스 오픈 API 클라이언트. "server-only" 가드로 Access/Secret Key가
// 클라이언트 번들에 절대 포함되지 않도록 한다.
//
// 2026-09-11 실계정 실호출로 검증 완료: 검색(GET) 서명/엔드포인트 정상 작동한다. 검색
// API가 돌려주는 productUrl은 이미 본인 파트너스 키로 추적되는 제휴 링크
// (link.coupang.com/re/AFFSDP?...)이므로, 등록 시 별도 딥링크 변환 없이 그대로 저장한다
// (딥링크 변환 API를 붙였다가 "url convert failed"(400)만 발생시켜서 제거함 — 이미
// 변환된 링크를 다시 변환하려 했던 것). "URL 직접 입력"으로 등록하는 경우도 네이버
// 브랜드커넥트(registerNaverProductAction)와 동일하게, 사용자가 쿠팡파트너스 사이트에서
// 직접 발급받은 제휴 링크를 그대로 붙여넣는다는 전제라 API 키가 필요 없다
// (호출부: src/lib/actions/products.ts).

const API_GATEWAY = "https://api-gateway.coupang.com";
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
function buildAuthorizationHeader(method: "GET", path: string, query: string, auth: CoupangAuthParams): string {
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
