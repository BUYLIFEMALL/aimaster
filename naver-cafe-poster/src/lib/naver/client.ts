import "server-only";

// 네이버 로그인 오픈 API 클라이언트. "server-only" 가드로 Client Secret/Access Token이
// 클라이언트 번들에 절대 포함되지 않도록 한다.
//
// 이 프로젝트(naver-cafe-poster)가 공용으로 등록한 단일 네이버 개발자센터 앱(NAVER_CLIENT_ID/
// NAVER_CLIENT_SECRET)을 모든 회원이 함께 쓴다 — threads-affiliate-poster가 Threads 앱을
// 재사용하는 것과 같은 구조다. 회원마다 각자 네이버 로그인으로 본인 계정을 연동해 access
// token을 받고, 그 토큰으로 "본인 명의"로만 카페 글쓰기가 된다.
//
// 참고: 네이버 로그인 authorize 엔드포인트는 OAuth2 표준과 달리 scope 파라미터가 없다 —
// 어떤 정보(카페 가입/글쓰기 등)에 접근 가능한지는 개발자센터 앱 등록 화면에서 미리
// 체크해둔 "제공 정보" 설정으로 결정된다(2026-09-11, blog.itcode.dev OAuth 가이드로 확인).
//
// 카페 글쓰기 API(POST /v1/cafe/{clubid}/menu/{menuid}/articles)의 정확한 응답 JSON 스키마는
// 네이버 개발자센터 상세 문서(로그인 필요, 이 환경에서 접근 불가)에서만 확인 가능해서 아직
// 실계정으로 검증하지 못했다 — subject/content/openyn 요청 파라미터까지는 커뮤니티 문서로
// 확인했지만, 성공 응답 필드명은 모른다. 그래서 HTTP status만으로 성공/실패를 판단하고,
// 원본 응답 전체를 raw_response에 그대로 저장해둔다 — 첫 실계정 테스트 후 이 부분을
// 실제 응답 기준으로 다시 손봐야 한다.

const AUTHORIZE_URL = "https://nid.naver.com/oauth2.0/authorize";
const TOKEN_URL = "https://nid.naver.com/oauth2.0/token";
const PROFILE_URL = "https://openapi.naver.com/v1/nid/me";
const CAFE_BASE = "https://openapi.naver.com/v1/cafe";

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`환경변수 ${name}가 설정되지 않았습니다.`);
  }
  return value;
}

export function getNaverAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: getEnv("NAVER_CLIENT_ID"),
    redirect_uri: getEnv("NAVER_REDIRECT_URI"),
    state,
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

export interface NaverTokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: string;
}

export async function exchangeNaverCode(code: string, state: string): Promise<NaverTokenResponse> {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: getEnv("NAVER_CLIENT_ID"),
    client_secret: getEnv("NAVER_CLIENT_SECRET"),
    code,
    state,
  });

  const response = await fetch(`${TOKEN_URL}?${params.toString()}`);
  const data = (await response.json()) as NaverTokenResponse & { error?: string; error_description?: string };

  if (!response.ok || data.error) {
    throw new Error(
      data.error_description
        ? `네이버 로그인 토큰 발급에 실패했습니다: ${data.error_description}`
        : `네이버 로그인 토큰 발급에 실패했습니다. (${response.status})`,
    );
  }

  return data;
}

export interface NaverProfile {
  id: string;
  nickname: string | null;
}

export async function getNaverProfile(accessToken: string): Promise<NaverProfile> {
  const response = await fetch(PROFILE_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = (await response.json()) as {
    resultcode: string;
    message: string;
    response?: { id: string; nickname?: string };
  };

  if (!response.ok || data.resultcode !== "00" || !data.response) {
    throw new Error(`네이버 프로필 조회에 실패했습니다: ${data.message ?? response.status}`);
  }

  return { id: data.response.id, nickname: data.response.nickname ?? null };
}

export interface CreateCafeArticleParams {
  accessToken: string;
  clubId: string;
  menuId: string;
  subject: string;
  content: string;
}

export interface CreateCafeArticleResult {
  ok: boolean;
  rawResponse: unknown;
}

/**
 * 네이버 카페 게시판에 글을 등록한다. 응답 성공 여부 판단 기준(정확한 필드명)이 아직
 * 미확인이라, HTTP status만으로 판단하고 원본 응답은 호출부에서 raw_response로 저장한다.
 */
export async function createCafeArticle(params: CreateCafeArticleParams): Promise<CreateCafeArticleResult> {
  const { accessToken, clubId, menuId, subject, content } = params;

  const body = new URLSearchParams({ subject, content, openyn: "true" });

  const response = await fetch(`${CAFE_BASE}/${clubId}/menu/${menuId}/articles`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const text = await response.text();
  let rawResponse: unknown = text;
  try {
    rawResponse = JSON.parse(text);
  } catch {
    // 응답이 JSON이 아니면 텍스트 그대로 보관한다.
  }

  if (!response.ok) {
    const message =
      rawResponse && typeof rawResponse === "object" && "message" in rawResponse
        ? String((rawResponse as { message?: unknown }).message)
        : text.slice(0, 300);
    throw new Error(`네이버 카페 게시글 등록에 실패했습니다. (${response.status}) ${message}`);
  }

  return { ok: true, rawResponse };
}
