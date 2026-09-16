import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// mbti-character와 동일한 결정: 랜딩 페이지(/)는 비로그인 방문자도 볼 수 있는 마케팅
// 화면으로 남겨두고, 실제 카드 뽑기(/draw)와 결과(/result) 이용에는 로그인을 요구한다 —
// AIMaster 회원가입 유도 채널 역할도 겸한다.
const AUTH_REQUIRED_PATHS = ["/draw", "/result", "/settings"];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
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
