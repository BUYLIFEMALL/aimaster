import { NextResponse, type NextRequest } from "next/server";

// 로그인 후 원래 가려던 경로로 돌아오도록, 서버 컴포넌트가 읽을 수 있게 현재 경로를 헤더에 실어둔다.
export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)"],
};
