import "server-only";
import crypto from "crypto";

// 알리익스프레스 Affiliate API 클라이언트("server-only" 가드).
// threads-affiliate-poster의 client.ts(실계정 aliexpress.affiliate.link.generate 호출
// 검증 완료, 2026-08-28)와 동일한 TOP API(Taobao Open Platform) 게이트웨이/서명 규약을
// 그대로 재사용한다. 여기서는 상품 검색(aliexpress.affiliate.product.query)만 추가한다 —
// 파라미터/응답 필드는 공식 유지보수 SDK(github.com/sergioteula/python-aliexpress-api,
// aliexpress_api/skd/api/rest/AliexpressAffiliateProductQueryRequest.py +
// aliexpress_api/models/product.py)를 1차 소스로 확인함.

const GATEWAY = "https://api-sg.aliexpress.com/sync";

interface AliexpressAuthParams {
  appKey: string;
  appSecret: string;
}

/** TOP API 표준 서명: 정렬된 key+value를 이어붙인 문자열의 앞뒤에 secret을 붙여 MD5(대문자 hex). */
function signParams(params: Record<string, string>, appSecret: string): string {
  const sortedKeys = Object.keys(params).sort();
  const base = sortedKeys.map((key) => `${key}${params[key]}`).join("");
  const raw = `${appSecret}${base}${appSecret}`;
  return crypto.createHash("md5").update(raw, "utf8").digest("hex").toUpperCase();
}

async function callTopApi(
  method: string,
  bizParams: Record<string, string>,
  auth: AliexpressAuthParams,
): Promise<Record<string, unknown>> {
  const timestamp = String(Date.now());
  const params: Record<string, string> = {
    app_key: auth.appKey,
    method,
    timestamp,
    sign_method: "md5",
    format: "json",
    v: "2.0",
    ...bizParams,
  };
  params.sign = signParams(params, auth.appSecret);

  const body = new URLSearchParams(params);

  const response = await fetch(GATEWAY, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`알리익스프레스 API 요청이 실패했습니다. (${response.status}) ${text.slice(0, 300)}`);
  }

  const data = (await response.json()) as Record<string, unknown> & {
    error_response?: { msg?: string; sub_msg?: string };
  };

  if (data.error_response) {
    throw new Error(
      `알리익스프레스 API 오류: ${data.error_response.sub_msg ?? data.error_response.msg ?? "알 수 없는 오류"}`,
    );
  }

  return data;
}

export interface AliexpressProduct {
  productId: string;
  title: string;
  imageUrl: string;
  salePriceKrw: number | null;
  originalPriceKrw: number | null;
  evaluateRate: string | null;
  volume: number | null;
  detailUrl: string;
}

/**
 * 키워드로 소싱 후보 상품을 검색한다. target_currency=KRW로 요청해서 원화로 바로
 * 받는다(환율 계산을 클라이언트가 따로 안 해도 됨). method: aliexpress.affiliate.product.query
 */
export async function searchProducts(
  keyword: string,
  auth: AliexpressAuthParams & { trackingId: string; pageSize?: number },
): Promise<AliexpressProduct[]> {
  const data = await callTopApi(
    "aliexpress.affiliate.product.query",
    {
      keywords: keyword,
      tracking_id: auth.trackingId,
      target_currency: "KRW",
      target_language: "KO",
      sort: "LAST_VOLUME_DESC",
      page_size: String(auth.pageSize ?? 10),
      page_no: "1",
    },
    auth,
  );

  const result = data["aliexpress_affiliate_product_query_response"] as
    | {
        resp_result?: {
          result?: {
            products?: {
              product?: Array<{
                product_id?: number | string;
                product_title?: string;
                product_main_image_url?: string;
                sale_price?: string;
                target_sale_price?: string;
                original_price?: string;
                target_original_price?: string;
                evaluate_rate?: string;
                lastest_volume?: number;
                product_detail_url?: string;
                promotion_link?: string;
              }>;
            };
          };
        };
      }
    | undefined;

  const products = result?.resp_result?.result?.products?.product ?? [];

  const parsePrice = (value?: string): number | null => {
    if (!value) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.round(parsed) : null;
  };

  return products.map((p) => ({
    productId: String(p.product_id ?? ""),
    title: p.product_title ?? "",
    imageUrl: p.product_main_image_url ?? "",
    salePriceKrw: parsePrice(p.target_sale_price ?? p.sale_price),
    originalPriceKrw: parsePrice(p.target_original_price ?? p.original_price),
    evaluateRate: p.evaluate_rate ?? null,
    volume: p.lastest_volume ?? null,
    detailUrl: p.promotion_link || p.product_detail_url || "",
  }));
}
