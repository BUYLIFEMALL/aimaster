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
