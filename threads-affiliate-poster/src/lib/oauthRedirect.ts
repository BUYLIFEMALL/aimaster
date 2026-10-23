import { IS_STANDALONE, SITE_URL } from "@/lib/deployment";

// 옛 *.vercel.app 주소 삭제 대비(2026-10-16, docs/OLD_DOMAIN_RETIREMENT_PLAN_20261016.md, 기준 구현 threads-comment-reply):
// 회원 본인 Meta 앱에 등록된 콜백이 옛 주소(환경변수)일 수도, 새 주소일 수도 있어 두 주소를 모두 지원한다.
// 인증 요청과 토큰 교환의 redirect_uri는 같아야 하므로, 콜백은 어느 주소로 돌아왔는지(via=old)로 판정한다.
// 독립 배포본(배포 키트 KIT/)은 자기 주소(NEXT_PUBLIC_SITE_URL)만 쓰고 buylife.xyz로 넘기지 않는다.
export const SITE_ORIGIN = IS_STANDALONE && SITE_URL ? SITE_URL : "https://threads-affiliate-poster.buylife.xyz";
const CALLBACK_PATH = "/api/threads/callback";

export const THREADS_REDIRECT_NEW = `${SITE_ORIGIN}${CALLBACK_PATH}`;

/** 회원 앱에 예전부터 등록된 콜백(옛 주소). 환경변수가 없으면 새 주소와 같다. */
export function THREADS_REDIRECT_OLD(): string {
  return process.env.THREADS_REDIRECT_URI || THREADS_REDIRECT_NEW;
}

export type CallbackMode = "old" | "new";

export function THREADS_REDIRECT_FOR(mode: CallbackMode): string {
  return mode === "new" ? THREADS_REDIRECT_NEW : THREADS_REDIRECT_OLD();
}

/** AIMaster 운영본에서 옛 *.vercel.app 주소로 들어온 요청인지(독립 배포본은 항상 false) */
export function isLegacyHost(host: string): boolean {
  return !IS_STANDALONE && host.endsWith(".vercel.app");
}
