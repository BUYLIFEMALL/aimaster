import "server-only";

// 네이버 검색어트렌드(DataLab Search Trend) 클라이언트.
//
// 2026-07-31부로 이 API는 (구)네이버 개발자센터가 아니라 NAVER API HUB(NCP)에서 신규
// 발급된다 — 애플리케이션 등록 화면에도 이제 검색/데이터랩 선택지가 없다. 그래서 이 클라이언트는
// API HUB를 1차로 시도하고, 인증/미가입류 오류(401/403/404)일 때만 구방식(openapi.naver.com)으로
// 자동 폴백한다. 구방식은 2026-07-30 24시 이전에 이미 신청해둔 애플리케이션만 2027-06-30까지
// 한시적으로 동작한다(AIMaster 본체의 "BUYLIFE" 앱이 여기 해당되어 2026-08-30 기준 정상 동작을
// 개발자센터 콘솔에서 직접 확인했다). 신규 회원은 이 폴백 대상이 아니므로 API HUB 쪽이 정상
// 응답해야 한다 — 아직 API HUB 실계정으로는 검증하지 못했다(엔드포인트/헤더는 공개된 MCP 서버
// 구현체 isnow890/naver-search-mcp 소스코드 근거).

const HUB_ENDPOINT = "https://naverapihub.apigw.ntruss.com/search-trend/v1/search";
const LEGACY_ENDPOINT = "https://openapi.naver.com/v1/datalab/search";

// 폴백을 트리거하는 상태코드. 이 값들은 "이 인증 방식/엔드포인트로는 안 된다"는 뜻이라
// 다른 경로로 재시도할 가치가 있다. 그 외(400 등 요청 자체 오류)는 재시도해도 똑같이
// 실패하므로 바로 사용자에게 보여준다.
const FALLBACK_STATUSES = new Set([401, 403, 404]);

export type TrendTimeUnit = "date" | "week" | "month";

export interface TrendKeywordGroup {
  groupName: string;
  keywords: string[];
}

export interface TrendResultGroup {
  title: string;
  keywords: string[];
  data: { period: string; ratio: number }[];
}

interface SearchTrendResponse {
  startDate: string;
  endDate: string;
  timeUnit: string;
  results: TrendResultGroup[];
}

interface CallResult {
  ok: boolean;
  status: number;
  body: string;
  data?: SearchTrendResponse;
}

async function callEndpoint(
  url: string,
  headers: Record<string, string>,
  payload: unknown,
): Promise<CallResult> {
  const response = await fetch(url, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  if (!response.ok) {
    return { ok: false, status: response.status, body: text };
  }
  return { ok: true, status: response.status, body: text, data: JSON.parse(text) as SearchTrendResponse };
}

/** 최대 5개 그룹, 그룹당 최대 20개 키워드(네이버 데이터랩 공통 제약). */
export async function fetchSearchTrend(
  auth: { clientId: string; clientSecret: string },
  params: { startDate: string; endDate: string; timeUnit: TrendTimeUnit; keywordGroups: TrendKeywordGroup[] },
): Promise<TrendResultGroup[]> {
  const hubResult = await callEndpoint(
    HUB_ENDPOINT,
    { "X-NCP-APIGW-API-KEY-ID": auth.clientId, "X-NCP-APIGW-API-KEY": auth.clientSecret },
    params,
  );
  if (hubResult.ok) return hubResult.data!.results ?? [];

  if (!FALLBACK_STATUSES.has(hubResult.status)) {
    throw new Error(`네이버 검색어트렌드 조회에 실패했습니다. (API HUB, ${hubResult.status}) ${hubResult.body.slice(0, 300)}`);
  }

  // API HUB에서 인증/미가입류 오류 → 2026-07-30 이전 유예 계정일 수 있으니 구방식으로 재시도.
  const legacyResult = await callEndpoint(
    LEGACY_ENDPOINT,
    { "X-Naver-Client-Id": auth.clientId, "X-Naver-Client-Secret": auth.clientSecret },
    params,
  );
  if (legacyResult.ok) return legacyResult.data!.results ?? [];

  throw new Error(
    `네이버 검색어트렌드 조회에 실패했습니다. API HUB(${hubResult.status})와 구방식(${legacyResult.status}) ` +
      `둘 다 실패했습니다. NCP 콘솔에서 API HUB "검색어트렌드" 이용 신청이 되어있는지 확인해주세요. ` +
      `(구방식 응답: ${legacyResult.body.slice(0, 200)})`,
  );
}
