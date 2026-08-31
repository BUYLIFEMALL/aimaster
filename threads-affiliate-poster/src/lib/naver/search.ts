import "server-only";

// 네이버 검색(뉴스/블로그/카페글) 클라이언트. trend.ts와 동일하게 API HUB를 1차로 시도하고
// 인증/미가입류 오류(401/403/404)일 때만 구방식(openapi.naver.com)으로 자동 폴백한다.
//
// 근거: base URL은 공개된 MCP 서버 구현체(isnow890/naver-search-mcp)의 소스코드에서 확인했다
// (legacy: https://openapi.naver.com/v1/search, hub: https://naverapihub.apigw.ntruss.com/search/v1).
// 타입별 경로(news.json/blog.json/cafearticle.json)는 네이버 공식 문서가 수년간 유지해온 규격을
// 그대로 적용한 것이라 legacy 쪽은 신뢰도가 높지만, hub 쪽 타입별 경로는 아직 실계정으로
// 검증 전이다 — 401/404가 나면 이 파일부터 재확인할 것.

const HUB_BASE = "https://naverapihub.apigw.ntruss.com/search/v1";
const LEGACY_BASE = "https://openapi.naver.com/v1/search";
const FALLBACK_STATUSES = new Set([401, 403, 404]);

export type NaverSearchType = "news" | "blog" | "cafearticle";

export interface NaverSearchItem {
  title: string;
  link: string;
  description: string;
  pubDate?: string;
  postdate?: string;
  bloggername?: string;
  cafename?: string;
}

interface RawSearchResponse {
  lastBuildDate: string;
  total: number;
  start: number;
  display: number;
  items: NaverSearchItem[];
}

interface CallResult {
  ok: boolean;
  status: number;
  body: string;
  data?: RawSearchResponse;
}

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]*>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

async function callEndpoint(url: string, headers: Record<string, string>): Promise<CallResult> {
  const response = await fetch(url, { headers });
  const text = await response.text();
  if (!response.ok) return { ok: false, status: response.status, body: text };
  return { ok: true, status: response.status, body: text, data: JSON.parse(text) as RawSearchResponse };
}

export async function searchNaver(
  auth: { clientId: string; clientSecret: string },
  type: NaverSearchType,
  query: string,
  display = 10,
): Promise<NaverSearchItem[]> {
  const qs = `?query=${encodeURIComponent(query)}&display=${display}&sort=date`;

  const hubResult = await callEndpoint(`${HUB_BASE}/${type}.json${qs}`, {
    "X-NCP-APIGW-API-KEY-ID": auth.clientId,
    "X-NCP-APIGW-API-KEY": auth.clientSecret,
  });

  let raw: RawSearchResponse;
  if (hubResult.ok) {
    raw = hubResult.data!;
  } else if (FALLBACK_STATUSES.has(hubResult.status)) {
    const legacyResult = await callEndpoint(`${LEGACY_BASE}/${type}.json${qs}`, {
      "X-Naver-Client-Id": auth.clientId,
      "X-Naver-Client-Secret": auth.clientSecret,
    });
    if (!legacyResult.ok) {
      throw new Error(
        `네이버 ${type} 검색에 실패했습니다. API HUB(${hubResult.status})와 구방식(${legacyResult.status}) 둘 다 실패했습니다.`,
      );
    }
    raw = legacyResult.data!;
  } else {
    throw new Error(`네이버 ${type} 검색에 실패했습니다. (${hubResult.status}) ${hubResult.body.slice(0, 300)}`);
  }

  return (raw.items ?? []).map((item) => ({
    ...item,
    title: stripHtml(item.title),
    description: stripHtml(item.description),
  }));
}
