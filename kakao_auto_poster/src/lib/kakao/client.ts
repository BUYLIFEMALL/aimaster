import "server-only";

// 카카오 로그인("나에게 보내기") 연동. threads/src/lib/threads/client.ts와 동일한 구조 —
// 이 모듈은 서버 코드(Server Action / Route Handler)에서만 import 해야 한다. Access/Refresh
// Token이 브라우저로 절대 전달되지 않도록 여기서만 카카오 API를 호출한다.
//
// "친구에게 보내기"(비즈앱 심사 필요, 최대 100건/일)와 달리 "나에게 보내기"는 카카오 로그인
// 동의(talk_message)만 있으면 심사 없이 무료로, 서버가 access_token만 들고 있으면 사용자
// 클릭 없이 즉시 발송된다 — https://developers.kakao.com/docs/ko/kakaotalk-message/common
// 참고. 기존 SOLAPI 방식(카카오 채널 개설 + SOLAPI 계정 필요, 건당 과금)의 진입장벽을 낮추는
// 대안 채널이다.
const AUTHORIZE_BASE = "https://kauth.kakao.com/oauth/authorize";
const TOKEN_BASE = "https://kauth.kakao.com/oauth/token";
const API_BASE = "https://kapi.kakao.com";

const KAKAO_SCOPES = "talk_message";

export interface KakaoTokenResponse {
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number; // access_token 만료(초)
  refresh_token_expires_in?: number; // refresh_token 만료(초), 갱신 응답에는 없을 수 있음
  scope?: string;
}

export interface KakaoUserProfile {
  id: number;
  properties?: { nickname?: string };
}

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`환경변수 ${name}가 설정되지 않았습니다.`);
  }
  return value;
}

async function parseKakaoResponse<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok) {
    const err = body as { error?: string; error_description?: string; msg?: string };
    throw new Error(err.error_description ?? err.msg ?? `카카오 API 요청이 실패했습니다. (${response.status})`);
  }
  return body as T;
}

export function getKakaoAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: getEnv("KAKAO_REST_API_KEY"),
    redirect_uri: getEnv("KAKAO_REDIRECT_URI"),
    response_type: "code",
    scope: KAKAO_SCOPES,
    state,
  });
  return `${AUTHORIZE_BASE}?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string): Promise<KakaoTokenResponse> {
  const form: Record<string, string> = {
    grant_type: "authorization_code",
    client_id: getEnv("KAKAO_REST_API_KEY"),
    redirect_uri: getEnv("KAKAO_REDIRECT_URI"),
    code,
  };
  // Client Secret은 카카오 개발자 콘솔에서 "활성화" 설정을 켠 경우에만 필요하다 — 안 켰으면
  // 빈 값으로 둬도 되므로 필수 환경변수로 강제하지 않는다.
  const clientSecret = process.env.KAKAO_CLIENT_SECRET;
  if (clientSecret) form.client_secret = clientSecret;

  const response = await fetch(TOKEN_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body: new URLSearchParams(form).toString(),
  });
  return parseKakaoResponse<KakaoTokenResponse>(response);
}

export async function refreshAccessToken(refreshToken: string): Promise<KakaoTokenResponse> {
  const form: Record<string, string> = {
    grant_type: "refresh_token",
    client_id: getEnv("KAKAO_REST_API_KEY"),
    refresh_token: refreshToken,
  };
  const clientSecret = process.env.KAKAO_CLIENT_SECRET;
  if (clientSecret) form.client_secret = clientSecret;

  const response = await fetch(TOKEN_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body: new URLSearchParams(form).toString(),
  });
  return parseKakaoResponse<KakaoTokenResponse>(response);
}

export async function getKakaoUserProfile(accessToken: string): Promise<KakaoUserProfile> {
  const response = await fetch(`${API_BASE}/v2/user/me?property_keys=%5B%22properties.nickname%22%5D`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return parseKakaoResponse<KakaoUserProfile>(response);
}

/**
 * "나에게 보내기" — 기본 템플릿(피드형)으로 리포트 1건을 본인 카카오톡("나와의 채팅방")에
 * 발송한다. 카카오 개발자 콘솔에서 템플릿을 미리 만들어둘 필요 없이, 매 발송마다 제목/요약/
 * 링크를 JSON으로 직접 채워 넣는 방식이라 리포트 내용이 매번 달라져도 그대로 자동화된다.
 */
export async function sendReportMemoToMe(
  accessToken: string,
  params: { title: string; summary: string; url: string; imageUrl?: string | null },
): Promise<void> {
  const templateObject = {
    object_type: "feed",
    content: {
      title: params.title,
      description: params.summary,
      image_url: params.imageUrl || undefined,
      image_width: params.imageUrl ? 800 : undefined,
      image_height: params.imageUrl ? 400 : undefined,
      link: { web_url: params.url, mobile_web_url: params.url },
    },
    buttons: [
      {
        title: "리포트 전체보기",
        link: { web_url: params.url, mobile_web_url: params.url },
      },
    ],
  };

  const response = await fetch(`${API_BASE}/v2/api/talk/memo/default/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
    },
    body: new URLSearchParams({ template_object: JSON.stringify(templateObject) }).toString(),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const err = body as { msg?: string; error_description?: string };
    throw new Error(err.msg ?? err.error_description ?? `카카오 메시지 발송에 실패했습니다. (${response.status})`);
  }
}
