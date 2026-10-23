import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { cookieDomainForHost } from "@/lib/supabase/cookieDomain";

const PUBLIC_PATHS = ["/login", "/signup"];

// 2026-10-16 도메인 통일(SSO): 옛 *.vercel.app 주소로 들어온 화면 요청은 새 주소로 보낸다(로그인 쿠키는 .buylife.xyz에서만 공유).
// API는 옮기지 않는다(옛 주소의 크론·외부 호출·확장이 그대로 동작, 옛 주소는 지우지 않음).
const NEW_ORIGIN = "https://auto-threads-posting.buylife.xyz";

export async function proxy(request: NextRequest) {
  const reqHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  if (reqHost.endsWith(".vercel.app") && !request.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.redirect(`${NEW_ORIGIN}${request.nextUrl.pathname}${request.nextUrl.search}`, 308);
  }
  const cookieDomain = cookieDomainForHost(reqHost);
  // 딥링크로 바로 들어왔다가 로그인이 필요해서 /login으로 튕겨나갈 때, 로그인 후 원래
  // 보려던 그 페이지로 바로 돌아올 수 있게 현재 경로를 헤더에 실어둔다. 이 proxy가 대부분의
  // 경로에서 미리 걸러주지만, requireUser()의 자체 백스톱(예: "/" 페이지)에서도 같은 값을
  // 쓸 수 있도록 요청 헤더에도 남긴다.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname + request.nextUrl.search);

  let response = NextResponse.next({ request: { headers: requestHeaders } });

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
          response = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, cookieDomain ? { ...options, domain: cookieDomain } : options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  if (!user && !isPublicPath && pathname !== "/") {
    // 딥링크로 바로 들어왔다면 로그인 후 그 페이지로 바로 이어지도록 원래 경로를
    // ?redirect=로 실어 보낸다.
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirect", pathname + search);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isPublicPath) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
