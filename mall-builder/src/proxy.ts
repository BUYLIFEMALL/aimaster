// 요청 경로를 머리글로 넘김 — 손님 레이아웃이 폐쇄몰(D20)에서 「가입·마이페이지만 열어 두기」를 서버에서 판단할 때 쓴다(Next 16 proxy)
// 하위 도메인(2026-11-10): `<몰>.<MALL_ROOT_DOMAIN>` 으로 들어오면 `/s/<몰>/…` 로 바꿔 읽는다(주소창은 그대로). 기본값 localhost = 내 PC 시험용
// 운영 관문(T0 2026-11-12): 운영 스위치가 켜진 배포에서만 모든 요청이 로그인(메인 사이트 공유)·프로그램 이용 권한을 먼저 지난다(lib/platform-gate.ts)
import { NextResponse, type NextRequest } from "next/server";
import { mallSlugFromHost, subdomainRewritePath } from "@/lib/host";
import { PLATFORM_AIMASTER } from "@/lib/platform";
import { isOpenPath, platformGate } from "@/lib/platform-gate";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const slug = mallSlugFromHost(request.headers.get("host"), process.env.MALL_ROOT_DOMAIN ?? "localhost");
  const rewritten = slug ? subdomainRewritePath(pathname, slug) : null;
  const path = rewritten ?? pathname;

  let refreshed: { name: string; value: string; options?: Record<string, unknown> }[] = [];
  if (PLATFORM_AIMASTER && !isOpenPath(path)) {
    const gate = await platformGate(request);
    if (!gate.pass) return gate.response;
    refreshed = gate.cookies;
  }
  const done = (res: NextResponse) => {
    refreshed.forEach((c) => res.cookies.set(c.name, c.value, c.options));
    return res;
  };

  // 관문이 토큰을 갱신했으면 요청 쿠키가 바뀌었으므로 아래 머리글은 그 뒤에 만든다
  if (!rewritten && !path.startsWith("/s/")) return done(refreshed.length ? NextResponse.next({ request: { headers: new Headers(request.headers) } }) : NextResponse.next());

  const headers = new Headers(request.headers);
  headers.set("x-mb-path", path);
  if (!rewritten) return done(NextResponse.next({ request: { headers } }));
  const url = request.nextUrl.clone();
  url.pathname = rewritten;
  return done(NextResponse.rewrite(url, { request: { headers } }));
}

// 하위 도메인은 어느 경로로든 들어올 수 있어 넓게 받고, 정적 파일만 뺀다
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
