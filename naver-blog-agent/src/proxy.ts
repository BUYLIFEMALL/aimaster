import { NextResponse, type NextRequest } from "next/server";

// 2026-10-16 도메인 통일(SSO): 옛 *.vercel.app 주소로 들어온 화면 요청은 새 주소로 보낸다(로그인 쿠키는 .buylife.xyz에서만 공유).
// API는 옮기지 않는다(옛 주소의 크론·외부 호출·확장이 그대로 동작, 옛 주소는 지우지 않음).
const NEW_ORIGIN = "https://naver-blog-agent.buylife.xyz";

export function proxy(request: NextRequest) {
  const reqHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  if (reqHost.endsWith(".vercel.app") && !request.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.redirect(`${NEW_ORIGIN}${request.nextUrl.pathname}${request.nextUrl.search}`, 308);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
