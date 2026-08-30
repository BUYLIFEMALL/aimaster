import "server-only";

// 네이버 데이터랩 쇼핑인사이트 API 클라이언트.
// 공식 문서: https://developers.naver.com/docs/serviceapi/datalab/shopping/shopping.md
// 주의: 절대 검색량/매출이 아니라 조회 구간 내 최댓값을 100으로 둔 "상대 지수"다.
// 일 호출 한도 1,000회 — 반드시 trend_snapshots에 캐시해서 재호출을 최소화한다.

const DATALAB_BASE = "https://openapi.naver.com/v1/datalab/shopping";

export interface NaverAuth {
  clientId: string;
  clientSecret: string;
}

export type TimeUnit = "date" | "week" | "month";

export interface TrendPoint {
  period: string;
  ratio: number;
}

interface DatalabResponseGroup {
  title: string;
  data: TrendPoint[];
}

interface DatalabResponse {
  results: DatalabResponseGroup[];
}

async function callDatalab(auth: NaverAuth, path: string, body: Record<string, unknown>): Promise<DatalabResponse> {
  const res = await fetch(`${DATALAB_BASE}${path}`, {
    method: "POST",
    headers: {
      "X-Naver-Client-Id": auth.clientId,
      "X-Naver-Client-Secret": auth.clientSecret,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`네이버 데이터랩 API 호출 실패 (${res.status}): ${text || res.statusText}`);
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
  const res = await callDatalab(auth, "/categories", {
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
  const res = await callDatalab(auth, "/category/keywords", {
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
