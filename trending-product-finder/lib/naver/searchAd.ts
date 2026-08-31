import "server-only";
import crypto from "node:crypto";

// 네이버 검색광고(SearchAd) API - 키워드도구(연관키워드조회).
// 카테고리 선택 시 후보 상품군을 자동 추천하는 기능에 쓴다 — 쇼핑인사이트(관심도 상대지수)와
// 달리, 이 API는 실제 월간 검색수(PC/모바일)에 가까운 값과 경쟁정도를 준다.
//
// 인증: HMAC-SHA256 서명 방식. 서명 원문 = "{timestamp}.{method}.{uri}",
// 서명 = base64(HMAC-SHA256(원문, SECRET_KEY)). 요청 헤더에 X-Timestamp/X-API-KEY/
// X-Customer/X-Signature 4개를 실어 보낸다.
// 발급: searchad.naver.com에서 개인/사업자 광고주로 무료 가입 → 도구 > API 사용 관리에서
// ACCESS_LICENSE(API_KEY)/SECRET_KEY/CUSTOMER_ID 3종 발급.

const BASE_URL = "https://api.searchad.naver.com";
const KEYWORDS_TOOL_PATH = "/keywordstool";

export interface NaverAdsAuth {
  apiKey: string; // ACCESS_LICENSE
  secretKey: string;
  customerId: string;
}

export interface RelatedKeyword {
  keyword: string;
  monthlyPcSearches: number; // "< 10"은 5로 근사 처리
  monthlyMobileSearches: number;
  totalMonthlySearches: number;
  competitionLevel: string | null; // "높음" | "중간" | "낮음"
}

function generateSignature(timestamp: string, method: string, uri: string, secretKey: string): string {
  const message = `${timestamp}.${method}.${uri}`;
  return crypto.createHmac("sha256", secretKey).update(message).digest("base64");
}

function parseSearchCount(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() === "< 10") return 5;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * 시드 키워드로 연관 키워드 + 월간 검색수를 조회한다. 최대 5개까지 시드를 콤마로 묶어
 * 보낼 수 있지만, 여기서는 카테고리 대표 시드 1개만 받는다(사용성을 단순하게 유지).
 */
export async function getRelatedKeywords(auth: NaverAdsAuth, seedKeyword: string): Promise<RelatedKeyword[]> {
  const query = `hintKeywords=${encodeURIComponent(seedKeyword)}&showDetail=1`;
  const uri = `${KEYWORDS_TOOL_PATH}?${query}`;
  const timestamp = Date.now().toString();
  const signature = generateSignature(timestamp, "GET", KEYWORDS_TOOL_PATH, auth.secretKey);

  const res = await fetch(`${BASE_URL}${uri}`, {
    method: "GET",
    headers: {
      "X-Timestamp": timestamp,
      "X-API-KEY": auth.apiKey,
      "X-Customer": auth.customerId,
      "X-Signature": signature,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`네이버 검색광고 API 호출 실패 (${res.status}): ${text || res.statusText}`);
  }

  const data = await res.json();
  const list: Array<Record<string, unknown>> = data.keywordList ?? [];

  return list.map((item) => {
    const pc = parseSearchCount(item.monthlyPcQcCnt);
    const mobile = parseSearchCount(item.monthlyMobileQcCnt);
    return {
      keyword: String(item.relKeyword ?? ""),
      monthlyPcSearches: pc,
      monthlyMobileSearches: mobile,
      totalMonthlySearches: pc + mobile,
      competitionLevel: (item.compIdx as string) ?? null,
    };
  });
}
