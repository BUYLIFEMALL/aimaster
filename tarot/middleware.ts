import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { cookieDomainForHost } from "@/lib/supabase/cookieDomain";

// 랜딩 페이지(/)와 공유된 타로 결과 페이지(/result)는 비로그인 방문자도 볼 수 있도록 하고,
// 실제 새로운 카드 뽑기(/draw)와 설정(/settings) 이용에만 로그인을 요구한다.
const AUTH_REQUIRED_PATHS = ["/draw", "/settings"];

// 2026-10-16 도메인 통일(SSO): 옛 *.vercel.app 주소로 들어온 화면 요청은 새 주소로 보낸다(로그인 쿠키는 .buylife.xyz에서만 공유).
// API는 옮기지 않는다(옛 주소의 크론·외부 호출·확장이 그대로 동작, 옛 주소는 지우지 않음).
const NEW_ORIGIN = "https://tarot-reading.buylife.xyz";

export async function middleware(request: NextRequest) {
  const reqHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  if (reqHost.endsWith(".vercel.app") && !request.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.redirect(`${NEW_ORIGIN}${request.nextUrl.pathname}${request.nextUrl.search}`, 308);
  }
  const cookieDomain = cookieDomainForHost(reqHost);
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim())!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, cookieDomain ? { ...options, domain: cookieDomain } : options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthRequired = AUTH_REQUIRED_PATHS.some((p) => pathname.startsWith(p));

  if (isAuthRequired && !user) {
    // 공유 링크의 쿼리스트링(?cards=...&q=...)이 /login URL에 redirect 파라미터와 뒤섞이지
    // 않도록, request.nextUrl.clone() 대신 /login에 redirect 파라미터 하나만 깨끗하게 싣는다
    // (mbti-character에서 실기기로 확인된 버그를 처음부터 피하는 패턴).
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  if (user && pathname === "/login") {
    return NextResponse.redirect(new URL("/draw", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/og).*)"],
};
