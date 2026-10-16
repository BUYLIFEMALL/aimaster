// 옛 *.vercel.app 주소 삭제 대비(2026-10-16, docs/OLD_DOMAIN_RETIREMENT_PLAN_20261016.md, 기준 구현 threads-comment-reply):
// 회원 본인 네이버 앱에 등록된 콜백이 옛 주소(환경변수)일 수도, 새 주소일 수도 있어 두 주소를 모두 지원한다.
// 네이버는 토큰 교환 때 redirect_uri를 보내지 않으므로 인증 요청에서만 주소를 고르면 된다.
export const SITE_ORIGIN = "https://naver-cafe-poster.buylife.xyz";

export const NAVER_REDIRECT_NEW = `${SITE_ORIGIN}/api/naver/callback`;

/** 회원 앱에 예전부터 등록된 콜백(옛 주소). 환경변수가 없으면 새 주소와 같다. */
export function NAVER_REDIRECT_OLD(): string {
  return process.env.NAVER_REDIRECT_URI || NAVER_REDIRECT_NEW;
}

export type CallbackMode = "old" | "new";

export function NAVER_REDIRECT_FOR(mode: CallbackMode): string {
  return mode === "new" ? NAVER_REDIRECT_NEW : NAVER_REDIRECT_OLD();
}
