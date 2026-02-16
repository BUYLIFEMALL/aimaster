import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // 어필리에이트 ref 쿠키 설정 + 클릭 추적
  const ref = request.nextUrl.searchParams.get("ref");
  if (ref) {
    supabaseResponse.cookies.set("affiliate_ref", ref, {
      maxAge: 60 * 60 * 24 * 30, // 30일
      httpOnly: true,
      sameSite: "lax",
    });

    // 클릭 추적 (비동기, fire-and-forget)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    fetch(`${appUrl}/api/affiliate/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: ref, pageUrl: pathname }),
    }).catch(() => {});
  }

  // 인증 필요 라우트 보호
  const authRequiredPaths = ["/dashboard", "/affiliate", "/settings"];
  const isAuthRequired = authRequiredPaths.some((p) => pathname.startsWith(p));

  if (isAuthRequired && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // 동시 접속 제한: 세션 토큰 쿠키 확인
  // session_token 없으면 세션 만료로 간주하되, 로그인/가입 페이지로의 리디렉션 루프 방지
  if (isAuthRequired && user) {
    const sessionToken = request.cookies.get("session_token")?.value;
    if (!sessionToken) {
      // Supabase 세션은 있지만 session_token이 없음 → 로그아웃 필요
      // /login으로 보내되, 먼저 Supabase 세션을 클리어하기 위해 signout 파라미터 추가
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("session_expired", "true");
      return NextResponse.redirect(url);
    }
  }

  // 관리자 라우트 보호
  if (pathname.startsWith("/admin")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // 이미 로그인된 상태에서 auth 페이지 접근 시 리디렉트
  // 단, session_expired인 경우 리디렉트하지 않음 (세션 클리어 필요)
  if (user && (pathname === "/login" || pathname === "/register")) {
    const isSessionExpired = request.nextUrl.searchParams.get("session_expired") === "true";
    if (!isSessionExpired) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
