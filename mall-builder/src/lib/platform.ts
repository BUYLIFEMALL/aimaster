// T0(2026-11-12) 플랫폼 스위치 — 코드 하나 + 배포 둘.
// NEXT_PUBLIC_MALL_PLATFORM=aimaster  → 운영(AIMaster 운영 DB, mall-builder.buylife.xyz): 메인 사이트 로그인 공유·프로그램 이용 권한·몰 만들기는 관리자만
// 비어 있음                            → Lab(dev-mall-builder, AIMaster_dev) 또는 배포 키트: 지금까지처럼 자체 로그인, 권한 판정 없음
export const PLATFORM_AIMASTER = process.env.NEXT_PUBLIC_MALL_PLATFORM === "aimaster";
export const PROGRAM_SLUG = "mall-builder";
export const MAIN_SITE_URL = (process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://www.buylife.xyz").replace(/\/$/, "");

/** 메인 사이트 로그인 주소(로그인 뒤 이 프로그램의 원래 화면으로 돌아옴) */
export function mainLoginUrl(returnTo: string): string {
  return `${MAIN_SITE_URL}/login?redirect=${encodeURIComponent(returnTo)}`;
}

/** 로그인 없이 열어 두는 경로 — 예약 실행(비밀 열쇠로 따로 막음)·앱 설명 파일·아이콘·서비스 워커·고지 파일 */
export function isOpenPath(path: string): boolean {
  if (path.startsWith("/api/cron/")) return true;
  if (path === "/login") return true; // 운영에서는 메인 로그인으로 넘기는 화면
  if (["/sw.js", "/robots.txt", "/ai.txt", "/NOTICE", "/favicon.ico"].includes(path)) return true;
  if (/^\/s\/[^/]+\/(manifest\.webmanifest|app-icon(\/.*)?)$/.test(path)) return true;
  return false;
}
