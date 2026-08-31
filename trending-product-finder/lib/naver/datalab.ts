import "server-only";

// NAVER API HUB - Shopping Insight API 클라이언트.
// 공식 문서: https://api.ncloud-docs.com/docs/naver-api-hub-shopping-insight-categories
//           https://api.ncloud-docs.com/docs/naver-api-hub-shopping-insight-keywords
//
// 2026-07-31부로 구(舊) developers.naver.com 방식 신규 발급이 종료되어, 신규 사용자는
// 네이버클라우드 플랫폼(NCP) 개인/사업자 계정으로 console.ncloud.com/naver-api-hub 에서
// 새로 신청해야 한다. 요청/응답 바디 형식은 기존과 거의 동일하고, base URL과 인증 헤더
// 이름만 바뀌었다 (X-Naver-Client-Id → X-NCP-APIGW-API-KEY-ID 등).
//
// 주의: 절대 검색량/매출이 아니라 조회 구간 내 최댓값을 100으로 둔 "상대 지수"다.

const API_HUB_BASE = "https://naverapihub.apigw.ntruss.com/shopping/v1";

export interface NaverAuth {
  clientId: string;
  clientSecret: string;
}

export type TimeUnit = "date" | "week" | "month";

export interface TrendPoint {
  period: string;
  ratio: number;
}

interface ApiHubResponseGroup {
  title: string;
  data: TrendPoint[];
}

interface ApiHubResponse {
  results: ApiHubResponseGroup[];
}

async function callShoppingInsight(auth: NaverAuth, path: string, body: Record<string, unknown>): Promise<ApiHubResponse> {
  const res = await fetch(`${API_HUB_BASE}${path}`, {
    method: "POST",
    headers: {
      "X-NCP-APIGW-API-KEY-ID": auth.clientId,
      "X-NCP-APIGW-API-KEY": auth.clientSecret,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`NAVER API HUB 쇼핑인사이트 호출 실패 (${res.status}): ${text || res.statusText}`);
  }

  return res.json();
}

/** 카테고리(분야) 자체의 기간별 관심도 추이. 카테고리 간 비교(시즌성 파악)에 쓴다. */
export async function getCategoryTrend(
  auth: NaverAuth,
  params: {
    categoryName: string;
    categoryCode: string;
    startDate: string; // YYYY-MM-DD
    endDate: string;
    timeUnit?: TimeUnit;
  },
): Promise<TrendPoint[]> {
  const res = await callShoppingInsight(auth, "/categories", {
    startDate: params.startDate,
    endDate: params.endDate,
    timeUnit: params.timeUnit ?? "week",
    category: [{ name: params.categoryName, param: [params.categoryCode] }],
  });
  return res.results[0]?.data ?? [];
}

/** 특정 카테고리 안에서, 등록한 키워드 하나의 기간별 관심도 추이. */
export async function getCategoryKeywordTrend(
  auth: NaverAuth,
  params: {
    categoryName: string;
    categoryCode: string;
    keyword: string;
    startDate: string;
    endDate: string;
    timeUnit?: TimeUnit;
  },
): Promise<TrendPoint[]> {
  const res = await callShoppingInsight(auth, "/category/keywords", {
    startDate: params.startDate,
    endDate: params.endDate,
    timeUnit: params.timeUnit ?? "week",
    category: params.categoryCode,
    keyword: [{ name: params.keyword, param: [params.keyword] }],
  });
  return res.results[0]?.data ?? [];
}

/** 최근 구간 대비 이전 구간의 관심도 변화율(%)을 계산한다. 데이터가 부족하면 null. */
export function calcTrendChangePct(points: TrendPoint[]): number | null {
  if (points.length < 2) return null;
  const recent = points[points.length - 1]?.ratio ?? 0;
  const prevWindowLen = Math.max(1, Math.floor(points.length / 2));
  const prevPoints = points.slice(0, prevWindowLen);
  const prevAvg = prevPoints.reduce((sum, p) => sum + p.ratio, 0) / prevPoints.length;
  if (prevAvg === 0) return null;
  return ((recent - prevAvg) / prevAvg) * 100;
}
