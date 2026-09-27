import "server-only";
import crypto from "crypto";

// 알리익스프레스 Affiliate API 클라이언트("server-only" 가드).
//
// 참고: 알리익스프레스 제휴 API는 알리바바 오픈 플랫폼(TOP, Taobao Open Platform)과 동일한
// 게이트웨이/서명 규약을 쓴다(portals.aliexpress.com에서 App Key/Secret 발급). 이 파일은
// 그 표준 규약(MD5 서명, api-sg.aliexpress.com/sync 게이트웨이)을 재현한 것으로, 실제 계정
// 발급 후 첫 연동 시 공식 문서(portals.aliexpress.com/help/help_center_API.html)와
// 반드시 다시 대조해야 한다 — 특히 method 이름과 파라미터 스키마는 계정 등급/약관 동의
// 상태에 따라 달라질 수 있다.

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

export interface AliexpressPromotionLink {
  sourceValue: string;
  promotionLink: string;
}

/**
 * 상품 URL을 제휴 링크로 변환한다. method: aliexpress.affiliate.link.generate
 * (TOP API 표준 제휴 링크 생성 메서드명 — 계정 등급에 따라 이름이 다를 수 있어 실제
 * 연동 시 재확인 필요).
 */
export async function getPromotionLinks(
  productUrls: string[],
  auth: AliexpressAuthParams & { trackingId: string },
): Promise<AliexpressPromotionLink[]> {
  const data = await callTopApi(
    "aliexpress.affiliate.link.generate",
    {
      source_values: productUrls.join(","),
      promotion_link_type: "0",
      tracking_id: auth.trackingId,
    },
    auth,
  );

  const result = data["aliexpress_affiliate_link_generate_response"] as
    | {
        resp_result?: {
          result?: {
            promotion_links?: { promotion_link?: { promotion_link?: string; source_value?: string }[] };
          };
        };
      }
    | undefined;

  const links = result?.resp_result?.result?.promotion_links?.promotion_link ?? [];

  return links
    .filter((l) => l.promotion_link)
    .map((l) => ({
      sourceValue: l.source_value ?? "",
      promotionLink: l.promotion_link as string,
    }));
}

export async function resolveAliexpressUrl(url: string): Promise<string> {
  const trimmed = url.trim();
  if (!trimmed) return url;
  
  // 이미 item/{digits}.html 형태면 리졸브 불필요
  if (/item\/\d+\.html/i.test(trimmed)) {
    return trimmed;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(trimmed, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
      },
    });
    clearTimeout(timeoutId);
    if (res.url && res.url !== trimmed) {
      return res.url;
    }
  } catch (e) {
    console.warn("Failed to resolve shortened Aliexpress URL:", e);
  }

  return trimmed;
}

export function extractAliexpressProductId(url: string): string | null {
  if (!url) return null;
  const decoded = decodeURIComponent(url);

  const match =
    decoded.match(/item\/(\d+)\.html/i) ||
    decoded.match(/\/(\d+)\.html/i) ||
    decoded.match(/productId=(\d+)/i) ||
    decoded.match(/product\/(\d+)/i) ||
    decoded.match(/\/(\d{10,18})\.html/i) ||
    decoded.match(/(\d{10,18})/); // 10~18자리 알리 상품 ID 숫자 패턴

  return match ? match[1] : null;
}

export interface AliexpressProductDetail {
  productId: string;
  title?: string;
  imageUrl?: string;
}

export async function getProductDetails(
  productIds: string[],
  auth: AliexpressAuthParams & { trackingId: string },
): Promise<AliexpressProductDetail[]> {
  try {
    const validIds = productIds.filter(Boolean);
    if (validIds.length === 0) return [];

    const data = await callTopApi(
      "aliexpress.affiliate.productdetail.get",
      {
        product_ids: validIds.join(","),
        tracking_id: auth.trackingId,
        target_currency: "KRW",
        target_language: "KO",
      },
      auth,
    );

    const result = data["aliexpress_affiliate_productdetail_get_response"] as
      | {
          resp_result?: {
            result?: {
              products?: {
                product?: Array<{
                  product_id?: number | string;
                  product_title?: string;
                  product_main_image_url?: string;
                  product_small_image_urls?: { string?: string[] };
                }>;
              };
            };
          };
        }
      | undefined;

    const list = result?.resp_result?.result?.products?.product ?? [];
    return list.map((p) => {
      let rawImg = p.product_main_image_url || p.product_small_image_urls?.string?.[0];
      if (rawImg) {
        rawImg = rawImg.trim();
        if (rawImg.startsWith("//")) rawImg = `https:${rawImg}`;
        else if (rawImg.startsWith("http://")) rawImg = rawImg.replace("http://", "https://");
      }
      return {
        productId: String(p.product_id ?? ""),
        title: p.product_title,
        imageUrl: rawImg || undefined,
      };
    });
  } catch (err) {
    console.error("getProductDetails error:", err);
    return [];
  }
}


