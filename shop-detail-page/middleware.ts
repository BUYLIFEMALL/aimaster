import { NextResponse, type NextRequest } from "next/server";

// 딥링크로 바로 들어왔다가 로그인이 필요해서 /login으로 튕겨나갈 때, 로그인 후 원래
// 보려던 그 페이지로 바로 돌아올 수 있게 하기 위한 것이다. 서버 컴포넌트(requireUser())는
// 자기가 지금 어느 경로에서 호출됐는지 알 방법이 없어서, 미들웨어가 요청 경로를 헤더에
// 실어 넘겨주고 requireUser()가 그 헤더를 읽어 로그인 리다이렉트에 `?redirect=` 쿼리로 붙인다.
export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
