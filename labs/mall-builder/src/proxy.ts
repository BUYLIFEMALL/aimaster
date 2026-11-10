// 요청 경로를 머리글로 넘김 — 손님 레이아웃이 폐쇄몰(D20)에서 「가입·마이페이지만 열어 두기」를 서버에서 판단할 때 쓴다(Next 16 proxy)
// 하위 도메인(2026-11-10): `<몰>.<MALL_ROOT_DOMAIN>` 으로 들어오면 `/s/<몰>/…` 로 바꿔 읽는다(주소창은 그대로). 기본값 localhost = 내 PC 시험용
import { NextResponse, type NextRequest } from "next/server";
import { mallSlugFromHost, subdomainRewritePath } from "@/lib/host";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const slug = mallSlugFromHost(request.headers.get("host"), process.env.MALL_ROOT_DOMAIN ?? "localhost");
  const rewritten = slug ? subdomainRewritePath(pathname, slug) : null;
  const path = rewritten ?? pathname;
  if (!rewritten && !path.startsWith("/s/")) return NextResponse.next();

  const headers = new Headers(request.headers);
  headers.set("x-mb-path", path);
  if (!rewritten) return NextResponse.next({ request: { headers } });
  const url = request.nextUrl.clone();
  url.pathname = rewritten;
  return NextResponse.rewrite(url, { request: { headers } });
}

// 하위 도메인은 어느 경로로든 들어올 수 있어 넓게 받고, 정적 파일만 뺀다
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
