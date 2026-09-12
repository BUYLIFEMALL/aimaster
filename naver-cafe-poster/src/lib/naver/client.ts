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
// 네이버 개발자센터 상세 문서(로그인 필요, 이 환경에서 접근 불가)에서 확인할 수 없었지만,
// 2026-09-12 실계정 게시 성공 응답으로 { message: { result: { articleId, articleUrl, ... } } }
// 형태임을 확인했다(publish-core.ts의 extractArticleUrl 참고). 여전히 모든 경우의 응답
// 스키마를 보장할 수는 없어 HTTP status로 성공/실패를 판단하고, 원본 응답 전체는
// raw_response에 그대로 저장해둔다.

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

/**
 * 네이버 access token은 발급 후 약 1시간이면 만료된다(로그인 시 받은 refresh_token으로
 * 재발급 가능) — 카페 글쓰기 API를 부를 때마다 만료 여부를 확인해 필요하면 이 함수로
 * 갱신한다(2026-09-12, 실계정 게시 시도에서 만료 토큰으로 인한 401 "Authentication failed"
 * 재현·확인).
 */
export async function refreshNaverToken(refreshToken: string): Promise<NaverTokenResponse> {
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: getEnv("NAVER_CLIENT_ID"),
    client_secret: getEnv("NAVER_CLIENT_SECRET"),
    refresh_token: refreshToken,
  });

  const response = await fetch(`${TOKEN_URL}?${params.toString()}`);
  const data = (await response.json()) as NaverTokenResponse & { error?: string; error_description?: string };

  if (!response.ok || data.error) {
    throw new Error(
      data.error_description
        ? `네이버 토큰 갱신에 실패했습니다: ${data.error_description}`
        : `네이버 토큰 갱신에 실패했습니다. (${response.status})`,
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
  /** 실제 이미지로 첨부할 이미지의 공개 URL(있으면 서버에서 내려받아 파일로 첨부한다). */
  imageUrl?: string | null;
}

export interface CreateCafeArticleResult {
  ok: boolean;
  rawResponse: unknown;
}

/**
 * 이미지 URL을 텍스트로 본문에 붙이면 실제 이미지가 아니라 링크로만 보인다는 걸 실계정
 * 테스트로 확인했다(2026-09-12). 커뮤니티에 공개된 다른 개발자들의 구현(C#/멀티파트 예제)을
 * 조사해보니, 이 API는 원래 multipart/form-data로 이미지 "파일"을 image[0], image[1]... 필드에
 * 직접 첨부하는 방식을 지원한다 — 우리는 이미지를 Supabase Storage의 공개 URL로만 갖고
 * 있으므로, 그 URL에서 실제 바이트를 내려받아 파일 파트로 첨부한다.
 */
async function fetchImageAsBlob(imageUrl: string): Promise<Blob | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    return new Blob([buffer], { type: contentType });
  } catch {
    return null;
  }
}

/**
 * multipart/form-data의 텍스트 필드(subject/content) 값을 그냥 UTF-8 그대로 보내면
 * "&#65533;"류 HTML 엔티티로 깨진다(2026-09-12, 실계정 테스트로 확인) — 반면
 * x-www-form-urlencoded에서 통했던 "이중 퍼센트 인코딩"을 그대로 가져오면 이번엔 정반대로
 * 퍼센트 인코딩 문자열이 디코딩되지 않고 그대로("%EC%9D%B4..." 형태로) 저장됐다(마찬가지로
 * 실계정 테스트로 확인). 즉 이 서버는 전송 방식에 따라 디코딩 횟수가 다르다 —
 * x-www-form-urlencoded는 두 번, multipart는 한 번만 디코딩하는 것으로 보인다. 그래서
 * multipart에서는 인코딩을 한 번만 적용한다.
 */
function singleEncodeComponent(value: string): string {
  return encodeURIComponent(value);
}

/**
 * 네이버 카페 게시판에 글을 등록한다. 응답 성공 여부 판단 기준(정확한 필드명)이 아직
 * 미확인이라, HTTP status만으로 판단하고 원본 응답은 호출부에서 raw_response로 저장한다.
 *
 * multipart/form-data로 보낸다 — 실제 이미지 파일을 함께 보내려면 이 API가 원래 지원하는
 * 방식(multipart, image[0] 파일 파트)을 써야 한다(커뮤니티 구현 사례로 확인). fetch의
 * FormData를 쓰면 boundary 처리가 자동으로 된다.
 */
export async function createCafeArticle(params: CreateCafeArticleParams): Promise<CreateCafeArticleResult> {
  const { accessToken, clubId, menuId, subject, content, imageUrl } = params;

  const formData = new FormData();
  formData.append("subject", singleEncodeComponent(subject));
  formData.append("content", singleEncodeComponent(content));
  formData.append("openyn", "true");

  if (imageUrl) {
    const imageBlob = await fetchImageAsBlob(imageUrl);
    if (imageBlob) {
      const ext = imageBlob.type.split("/")[1]?.split("+")[0] || "jpg";
      formData.append("image[0]", imageBlob, `image.${ext}`);
    }
  }

  // Content-Type은 fetch가 FormData 바디에 맞춰 boundary까지 포함해 자동으로 설정하므로
  // 직접 지정하지 않는다(직접 지정하면 boundary가 빠져 파싱이 깨진다).
  const response = await fetch(`${CAFE_BASE}/${clubId}/menu/${menuId}/articles`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  const text = await response.text();
  let rawResponse: unknown = text;
  try {
    rawResponse = JSON.parse(text);
  } catch {
    // 응답이 JSON이 아니면 텍스트 그대로 보관한다.
  }

  if (!response.ok) {
    // rawResponse.message가 문자열이 아니라 객체(예: {errorCode, errorMessage})인 경우
    // String(obj)를 쓰면 "[object Object]"로 실제 내용이 사라진다(2026-09-12, 403 에러
    // 디버깅 중 발견) — JSON.stringify로 실제 내용을 보존한다.
    const rawMessage =
      rawResponse && typeof rawResponse === "object" && "message" in rawResponse
        ? (rawResponse as { message?: unknown }).message
        : undefined;
    const message =
      typeof rawMessage === "string"
        ? rawMessage
        : rawMessage !== undefined
          ? JSON.stringify(rawMessage)
          : text.slice(0, 300);
    throw new Error(`네이버 카페 게시글 등록에 실패했습니다. (${response.status}) ${message}`);
  }

  return { ok: true, rawResponse };
}
