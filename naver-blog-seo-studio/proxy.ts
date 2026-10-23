import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { cookieDomainForHost } from "@/lib/supabase/cookieDomain";

// 2026-10-16 도메인 통일(SSO): 옛 *.vercel.app 주소로 들어온 화면 요청은 새 주소로 보낸다(로그인 쿠키는 .buylife.xyz에서만 공유).
// API는 옮기지 않는다(옛 주소의 크론·외부 호출·확장이 그대로 동작, 옛 주소는 지우지 않음).
const NEW_ORIGIN = "https://naver-blog-seo-studio.buylife.xyz";

export async function proxy(request: NextRequest) {
  const reqHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  if (reqHost.endsWith(".vercel.app") && !request.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.redirect(`${NEW_ORIGIN}${request.nextUrl.pathname}${request.nextUrl.search}`, 308);
  }
  const cookieDomain = cookieDomainForHost(reqHost);
  let response = NextResponse.next({ request });
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
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, cookieDomain ? { ...options, domain: cookieDomain } : options));
        },
      },
    },
  );
  await supabase.auth.getUser();
  return response;
}

export const config = {
  // 옛 주소 화면 이동이 모든 화면(/, /login, /settings 포함)에 적용되도록 넓힘(2026-10-16). API·정적 파일은 제외.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/|downloads/).*)"],
};
