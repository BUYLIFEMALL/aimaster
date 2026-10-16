import { createBrowserClient } from "@supabase/ssr";
import { cookieDomainForHost } from "./cookieDomain";

// 도메인 공유 로그인(.buylife.xyz) 도입 전에 www 호스트에만 저장된 옛 sb-* 쿠키는, 새 방식(domain=.buylife.xyz)의
// 삭제 명령으로는 지워지지 않는다. 그 쿠키의 갱신 토큰이 이미 폐기됐으면 브라우저가 갱신 요청을 끝없이 반복해
// Supabase 429(요청 한도)에 걸려 로그인이 막힌다(2026-10-11). 페이지당 한 번, domain 없이 삭제해 옛 쿠키만 정리한다
// (domain=.buylife.xyz 로 저장된 현재 쿠키는 영향받지 않는다).
let staleHostCookiesCleared = false;
function clearStaleHostOnlyAuthCookies() {
  if (staleHostCookiesCleared || typeof document === "undefined") return;
  staleHostCookiesCleared = true;
  if (!cookieDomainForHost(window.location.hostname)) return;
  document.cookie.split(";").forEach((cookie) => {
    const name = cookie.split("=")[0]?.trim();
    if (name && name.startsWith("sb-")) {
      document.cookie = `${name}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }
  });
}

export function createClient() {
  clearStaleHostOnlyAuthCookies();
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim())!,
    {
      cookieOptions: {
        domain: typeof window === "undefined" ? undefined : cookieDomainForHost(window.location.hostname),
      },
    },
  );
}
