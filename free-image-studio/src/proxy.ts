import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { cookieDomainForHost } from "@/lib/supabase/cookieDomain";
import { sessionProxy } from "@/lib/sessionProxy";

// 로그인 쿠키 갱신과 현재 경로 전달만 한다. 로그인·이용 권한 차단은 레이아웃과 API의 판정이 맡는다.
// 갱신 순서·캐시 헤더·쿠키 보존은 sessionProxy가 맡는다(tests/sessionProxy.test.mjs).
export async function proxy(request: NextRequest) {
  return sessionProxy(request, {
    next: (headers) => NextResponse.next({ request: { headers } }),
    cookieDomain: cookieDomainForHost(request.headers.get("host")),
    refresh: async (cookies) => {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim())!,
        { cookies },
      );
      await supabase.auth.getUser();
    },
  });
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|ai.txt).*)"] };
