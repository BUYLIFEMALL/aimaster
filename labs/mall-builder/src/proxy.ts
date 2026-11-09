// 요청 경로를 머리글로 넘김 — 손님 레이아웃이 폐쇄몰(D20)에서 「가입·마이페이지만 열어 두기」를 서버에서 판단할 때 쓴다(Next 16 proxy)
import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-mb-path", request.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: ["/s/:path*"] };
