// T0(2026-11-12) 운영 관문 — 운영 스위치(NEXT_PUBLIC_MALL_PLATFORM=aimaster)가 켜진 배포에서만 proxy가 부른다.
// 모든 화면·서버 동작(폼 전송은 그 화면 주소로 들어옴)·내려받기 경로를 한 곳에서: 로그인(메인 사이트 공유) → 프로그램 이용 권한(정지→관리자→핸드폰→FREE→구독→등급+기간).
// 몰 데이터 보호는 지금처럼 DB 보안 규칙이 하고, 여기는 「AIMaster 회원 중 이 프로그램을 쓸 수 있는 사람인가」만 본다.
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_KEY, SUPABASE_URL } from "./supabase/env";
import { cookieDomainForHost } from "./supabase/cookieDomain";
import { createAdminClient } from "./supabase/admin";
import { checkProgramAccess } from "./programAccess";
import { MAIN_SITE_URL, PROGRAM_SLUG, mainLoginUrl } from "./platform";
export { isOpenPath } from "./platform";

/** 화면을 여는 요청인가(아니면 서버 동작·내려받기 → 이동 대신 오류 응답) */
function wantsPage(request: NextRequest): boolean {
  return request.method === "GET" && (request.headers.get("accept") ?? "").includes("text/html");
}

type CookieSet = { name: string; value: string; options?: Record<string, unknown> };

/**
 * 통과하면 { pass: true, cookies } — cookies는 로그인 토큰이 새로 갱신됐을 때 응답에 실어 보낼 쿠키(요청 쿠키에도 이미 반영됨).
 * 막으면 { pass: false, response }.
 */
export async function platformGate(request: NextRequest): Promise<{ pass: true; cookies: CookieSet[] } | { pass: false; response: NextResponse }> {
  const toSet: CookieSet[] = [];
  const domain = cookieDomainForHost(request.headers.get("host"));
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    ...(domain ? { cookieOptions: { domain } } : {}),
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        // 갱신된 토큰을 이 요청 뒤의 화면(서버 컴포넌트)도 보게 요청 쿠키에 넣고, 브라우저에도 보내도록 모아 둔다
        list.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          toSet.push({ name, value, options: options as Record<string, unknown> });
        });
      },
    },
  });
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  const withCookies = (res: NextResponse) => {
    toSet.forEach((c) => res.cookies.set(c.name, c.value, c.options));
    return res;
  };

  if (!user) {
    if (wantsPage(request)) return { pass: false, response: withCookies(NextResponse.redirect(mainLoginUrl(request.nextUrl.href))) };
    return { pass: false, response: withCookies(NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })) };
  }

  const access = await checkProgramAccess(createAdminClient() as unknown as Parameters<typeof checkProgramAccess>[0], user.id, PROGRAM_SLUG);
  if (!access.allowed) {
    const to =
      access.reason === "phone_required"
        ? `${MAIN_SITE_URL}/settings?need_phone=1`
        : `${MAIN_SITE_URL}/programs/${PROGRAM_SLUG}?${access.reason === "suspended" ? "error=suspended" : "need_access=1"}`;
    const message =
      access.reason === "phone_required"
        ? "핸드폰 번호를 입력 후 사용해주세요!"
        : access.reason === "suspended"
          ? "정지된 계정입니다."
          : "이 프로그램의 이용 권한이 없습니다. 메인 사이트에서 이용 권한을 확인해주세요.";
    if (wantsPage(request)) return { pass: false, response: withCookies(NextResponse.redirect(to)) };
    return { pass: false, response: withCookies(NextResponse.json({ error: message }, { status: 403 })) };
  }
  return { pass: true, cookies: toSet };
}
