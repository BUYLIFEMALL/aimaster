import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { cookieDomainForHost } from "@/lib/supabase/cookieDomain";
import { getSupabasePublicKey } from "@/lib/supabase/env";

// 공개된 옛 주소는 aimaster-five.vercel.app(Vercel 프로젝트 도메인). aimaster-buylife.vercel.app은 Vercel 로그인으로 보호된 팀 주소라 회원이 올 수 없지만 함께 둔다.
const LEGACY_HOSTS = new Set(["aimaster-five.vercel.app", "aimaster-buylife.vercel.app"]);

export async function middleware(request: NextRequest) {
  // 옛 주소(aimaster-five.vercel.app)의 화면 요청은 새 주소로 보낸다(2026-11-13). 옛 주소로 로그인하면 기기 정보가
  // 서버 이름으로 찍혀 동시 접속 제한(PC 1 + 모바일 1)에서 빠지기 때문. /api/는 회원이 외부에 등록한 OAuth 콜백·확장 호출이라
  // 그대로 둔다(docs/DOMAIN_SSO_POLICY.md). 배포별 미리보기 주소는 호스트가 달라 해당 없음.
  if (
    request.method === "GET" &&
    LEGACY_HOSTS.has(request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "") &&
    !request.nextUrl.pathname.startsWith("/api/") &&
    !request.nextUrl.pathname.startsWith("/_next/")
  ) {
    return NextResponse.redirect(new URL(request.nextUrl.pathname + request.nextUrl.search, "https://www.buylife.xyz"), 307);
  }

  // blog처럼 루트 앱 라우트에 내장되는 서브프로젝트는 자기 페이지에서 로그인이 필요할 때
  // 이 헤더로 "지금 어느 경로였는지"를 읽어서 /login?redirect=로 되돌아올 수 있게 한다
  // (blog/utils/access.ts 참고). 이 헤더 자체는 리다이렉트를 일으키지 않는 순수 정보 전달이다.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname + request.nextUrl.search);

  let supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });

  const cookieDomain = cookieDomainForHost(request.headers.get("x-forwarded-host") ?? request.headers.get("host"));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    getSupabasePublicKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, cookieDomain ? { ...options, domain: cookieDomain } : options)
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
      // 일반 회원 계정으로 관리자 화면을 열면 대시보드에서 이유를 알려 준다(2026-10-22)
      return NextResponse.redirect(new URL("/dashboard?notice=admin_only", request.url));
    }
  }

  // 이미 로그인된 상태에서 auth 페이지 접근 시 리디렉트
  // 단, session_expired인 경우 리디렉트하지 않음 (세션 클리어 필요)
  if (user && (pathname === "/login" || pathname === "/register")) {
    const isSessionExpired = request.nextUrl.searchParams.get("session_expired") === "true";
    if (!isSessionExpired) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
