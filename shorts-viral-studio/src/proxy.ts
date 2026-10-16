import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { cookieDomainForHost } from "@/lib/supabase/cookieDomain";

const PUBLIC_PATHS = ["/login", "/signup"];

// 도메인 로그인 공유(docs/DOMAIN_SSO_POLICY.md): 요청 호스트가 *.buylife.xyz 일 때만 로그인 쿠키를 .buylife.xyz 로 갱신해
// 다른 프로그램에서 한 로그인이 이 프로그램에서도 이어지게 한다. 이용 권한 확인은 각 페이지·서버 액션의 requireProgramAccess()가 한다.
export async function proxy(request: NextRequest) {
  // 딥링크로 들어왔다가 로그인 화면으로 갈 때 로그인 후 원래 페이지로 돌아오도록 현재 경로를 헤더로 전달한다(lib/auth.ts).
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname + request.nextUrl.search);

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const cookieDomain = cookieDomainForHost(request.headers.get("x-forwarded-host") ?? request.headers.get("host"));

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim())!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request: { headers: requestHeaders } });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, cookieDomain ? { ...options, domain: cookieDomain } : options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  if (!user && !isPublicPath) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirect", pathname + search);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isPublicPath) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
