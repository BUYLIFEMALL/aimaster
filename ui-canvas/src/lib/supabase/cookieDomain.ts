// 모든 *.buylife.xyz 프로그램이 로그인 쿠키를 공유하도록 쿠키 도메인을 정한다 (2026-10-10, 한 번 로그인으로 전체 프로그램 사용).
// *.vercel.app·localhost 처럼 buylife.xyz 가 아닌 주소에서는 도메인을 지정하지 않는다(브라우저가 거부하므로 로그인이 안 됨).
export const SHARED_COOKIE_DOMAIN = ".buylife.xyz";

export function cookieDomainForHost(host?: string | null): string | undefined {
  const h = (host ?? "").split(":")[0].toLowerCase();
  return h === "buylife.xyz" || h.endsWith(".buylife.xyz") ? SHARED_COOKIE_DOMAIN : undefined;
}
