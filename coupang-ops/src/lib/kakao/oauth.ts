// 카카오 「나에게 보내기」 연결. 기준 realty-listing-alert lib/kakaoOAuth.ts. 순수 함수만(tests/kakao.test.mjs).
// 회원 본인 카카오 앱(REST API 키·Client Secret)으로만 연결한다. 운영자 공용 앱 없음(최상위 규칙).
export const KAKAO_REDIRECT_URI = "https://coupang-ops.buylife.xyz/api/kakao/callback";
export const KAKAO_SCOPES = ["talk_message"];
export const STATE_COOKIE = "cops_kakao_state";
export const KAKAO_LINK = "https://coupang-ops.buylife.xyz/home";

export const isRestApiKey = (v: string) => /^[0-9a-f]{32}$/i.test(v.trim());
export const isClientSecret = (v: string) => /^[A-Za-z0-9]{16,64}$/.test(v.trim());

export function kakaoAuthorizeUrl(restApiKey: string, state: string) {
  const q = new URLSearchParams({ client_id: restApiKey, redirect_uri: KAKAO_REDIRECT_URI, response_type: "code", scope: KAKAO_SCOPES.join(","), state });
  return `https://kauth.kakao.com/oauth/authorize?${q.toString()}`;
}

/** state = 회원 번호 + 1회용 확인값. 콜백에서 쿠키·로그인 회원과 모두 맞아야 저장한다 */
export const makeState = (userId: string, nonce: string) => `${userId}.${nonce}`;
export function checkState(state: string | null, cookieValue: string | null | undefined, userId: string) {
  if (!state || !cookieValue || state !== cookieValue) return false;
  const [owner, nonce] = state.split(".");
  return owner === userId && !!nonce && nonce.length >= 16;
}
