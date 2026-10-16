// 옛 *.vercel.app 주소 삭제 대비(2026-10-16, docs/OLD_DOMAIN_RETIREMENT_PLAN_20261016.md, 기준 구현 threads-comment-reply):
// 회원 본인 카카오 앱에 등록된 콜백이 옛 주소(환경변수)일 수도, 새 주소일 수도 있어 두 주소를 모두 지원한다.
// 인증 요청과 토큰 교환의 redirect_uri는 같아야 하므로, 콜백은 어느 주소로 돌아왔는지(via=old)로 판정한다.
// 주의: 메시지·공유 링크 기준(NEXT_PUBLIC_SITE_URL)은 회원 카카오 앱 "웹 도메인" 등록과 묶여 있어 여기서 바꾸지 않는다.
export const SITE_ORIGIN = "https://kakao-auto-posting.buylife.xyz";
export const OLD_HOST = "kakaoautoposter.vercel.app";

export const KAKAO_REDIRECT_NEW = `${SITE_ORIGIN}/api/kakao/callback`;

/** 회원 앱에 예전부터 등록된 콜백(옛 주소). 환경변수가 없으면 새 주소와 같다. */
export function KAKAO_REDIRECT_OLD(): string {
  return process.env.KAKAO_REDIRECT_URI || KAKAO_REDIRECT_NEW;
}

export type CallbackMode = "old" | "new";

export function KAKAO_REDIRECT_FOR(mode: CallbackMode): string {
  return mode === "new" ? KAKAO_REDIRECT_NEW : KAKAO_REDIRECT_OLD();
}
