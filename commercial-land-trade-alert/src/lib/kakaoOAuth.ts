// 카카오 바로 연결(2026-10-25, v1.17 — 주인님 「이 프로그램 안에서 카카오 바로 연결」). 순수 함수만(시험용) — 토큰 교환·저장은 app/api/kakao/callback.
// 회원 본인 카카오 앱(REST API 키·Client Secret)으로만 연결한다. 운영자 공용 앱 없음(최상위 규칙). 기준: kakao_auto_poster src/lib/kakao/client.ts.

export const KAKAO_REDIRECT_URI = "https://commercial-land-trade-alert.buylife.xyz/api/kakao/callback";
export const KAKAO_SCOPES = ["talk_message"]; // 「나에게 보내기」
export const STATE_COOKIE = "clta_kakao_state";

/** REST API 키는 32자리 영문·숫자(16진) */
export function isRestApiKey(v: string) {
  return /^[0-9a-f]{32}$/i.test(v.trim());
}

/** Client Secret은 영문·숫자 16~64자(콘솔에서 「사용함」일 때만 필요 — 비워도 됨) */
export function isClientSecret(v: string) {
  return /^[A-Za-z0-9]{16,64}$/.test(v.trim());
}

export function kakaoAuthorizeUrl(restApiKey: string, state: string, redirectUri = KAKAO_REDIRECT_URI) {
  const q = new URLSearchParams({ client_id: restApiKey, redirect_uri: redirectUri, response_type: "code", scope: KAKAO_SCOPES.join(","), state });
  return `https://kauth.kakao.com/oauth/authorize?${q.toString()}`;
}

/** state = 회원 번호 + 1회용 확인값. 콜백에서 쿠키·로그인 회원과 모두 맞아야 저장한다(남이 끼워 넣은 연결 막기). */
export function makeState(userId: string, nonce: string) {
  return `${userId}.${nonce}`;
}

export function checkState(state: string | null, cookieValue: string | null | undefined, userId: string) {
  if (!state || !cookieValue || state !== cookieValue) return false;
  const [owner, nonce] = state.split(".");
  return owner === userId && !!nonce && nonce.length >= 16;
}
