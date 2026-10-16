// 옛 *.vercel.app 주소 삭제 대비(2026-10-16, docs/OLD_DOMAIN_RETIREMENT_PLAN_20261016.md):
// 회원 본인 Meta 앱에 등록된 콜백이 옛 주소(환경변수)일 수도, 새 주소일 수도 있어 두 주소를 모두 지원한다.
// 인증 요청과 토큰 교환의 redirect_uri는 같아야 하므로, 콜백은 어느 주소로 돌아왔는지(via=old)로 판정한다.
export const SITE_ORIGIN = "https://threads-comment-reply.buylife.xyz";
const CALLBACK_PATH = "/api/threads/callback";

export const NEW_REDIRECT_URI = `${SITE_ORIGIN}${CALLBACK_PATH}`;

/** 회원 앱에 예전부터 등록된 콜백(옛 주소). 환경변수가 없으면 새 주소와 같다. */
export function oldRedirectUri(): string {
  return process.env.META_THREADS_REDIRECT_URI || NEW_REDIRECT_URI;
}

export type CallbackMode = "old" | "new";

export function redirectUriFor(mode: CallbackMode): string {
  return mode === "new" ? NEW_REDIRECT_URI : oldRedirectUri();
}
