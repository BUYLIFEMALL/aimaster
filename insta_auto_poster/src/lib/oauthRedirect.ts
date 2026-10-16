// 옛 *.vercel.app 주소 삭제 대비(2026-10-16, docs/OLD_DOMAIN_RETIREMENT_PLAN_20261016.md, 기준 구현 threads-comment-reply):
// 회원 본인 Meta 앱에 등록된 콜백이 옛 주소(환경변수)일 수도, 새 주소일 수도 있어 두 주소를 모두 지원한다.
// 인증 요청과 토큰 교환의 redirect_uri는 같아야 하므로, 콜백은 어느 주소로 돌아왔는지(via=old)로 판정한다.
export const SITE_ORIGIN = "https://auto-instagram-posting.buylife.xyz";

export type CallbackMode = "old" | "new";

// Facebook 로그인 방식(/api/instagram/callback)
export const FACEBOOK_REDIRECT_NEW = `${SITE_ORIGIN}/api/instagram/callback`;
export function FACEBOOK_REDIRECT_OLD(): string {
  return process.env.META_INSTAGRAM_REDIRECT_URI || FACEBOOK_REDIRECT_NEW;
}
export function FACEBOOK_REDIRECT_FOR(mode: CallbackMode): string {
  return mode === "new" ? FACEBOOK_REDIRECT_NEW : FACEBOOK_REDIRECT_OLD();
}

// Instagram 로그인 방식(/api/instagram/callback/byok)
export const INSTAGRAM_REDIRECT_NEW = `${SITE_ORIGIN}/api/instagram/callback/byok`;
export function INSTAGRAM_REDIRECT_OLD(): string {
  return process.env.META_INSTAGRAM_BYOK_REDIRECT_URI || INSTAGRAM_REDIRECT_NEW;
}
export function INSTAGRAM_REDIRECT_FOR(mode: CallbackMode): string {
  return mode === "new" ? INSTAGRAM_REDIRECT_NEW : INSTAGRAM_REDIRECT_OLD();
}
