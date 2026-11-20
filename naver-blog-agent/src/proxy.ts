import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { cookieDomainForHost } from "@/lib/supabase/cookieDomain";

// 2026-10-16 도메인 통일(SSO): 옛 *.vercel.app 주소로 들어온 화면 요청은 새 주소로 보낸다(로그인 쿠키는 .buylife.xyz에서만 공유).
// API는 옮기지 않는다(옛 주소의 크론·외부 호출·확장이 그대로 동작, 옛 주소는 지우지 않음).
const NEW_ORIGIN = "https://naver-blog-agent.buylife.xyz";

// 2026-11-20 BLC-INS-08(새로고침 뒤 로그인 풀림): 서버 컴포넌트는 쿠키를 쓸 수 없어(server.ts setAll 무시) 만료된 접근 토큰이
// 갱신되지 않았다. 다른 블로그 프로그램(naver-blog-seo-studio·tistory-auto-blog·ai-auto-blog)처럼 화면 요청마다 프록시에서
// 세션을 갱신해 응답 쿠키에 쓴다(공유 도메인 .buylife.xyz 규칙 그대로). 옛 주소 넘김은 지금처럼 먼저 처리한다.
export async function proxy(request: NextRequest) {
  const reqHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  if (reqHost.endsWith(".vercel.app") && !request.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.redirect(`${NEW_ORIGIN}${request.nextUrl.pathname}${request.nextUrl.search}`, 308);
  }
  const cookieDomain = cookieDomainForHost(reqHost);
  // 2026-11-20 P2(Mac msg_b686ef72ba0d): @supabase/ssr 0.12.x는 setAll(cookies, headers)의 두 번째 인수로 캐시 금지 헤더
  // (Cache-Control·Expires·Pragma)를 「첫 쿠키 쓰기 때만」 준다. 호출마다 응답을 새로 만들면 앞 호출의 헤더·쿠키가 빠지므로,
  // 쿠키(청크 삭제용 빈 쿠키 포함)와 헤더를 모아 두었다가 세션 확인 뒤 최종 응답 하나에 한꺼번에 반영한다.
  const cookiesToWrite = new Map<string, { value: string; options: CookieOptions }>();
  const headersToWrite = new Map<string, string>();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim())!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            cookiesToWrite.set(name, { value, options: cookieDomain ? { ...options, domain: cookieDomain } : options });
          });
          Object.entries(headers ?? {}).forEach(([key, value]) => headersToWrite.set(key, value));
        },
      },
    },
  );
  await supabase.auth.getUser();
  const response = NextResponse.next({ request });
  cookiesToWrite.forEach(({ value, options }, name) => response.cookies.set(name, value, options));
  headersToWrite.forEach((value, key) => response.headers.set(key, value));
  return response;
}

export const config = {
  // API·정적 파일·확장 다운로드(downloads/)는 세션 갱신 대상이 아니다.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/|downloads/).*)"],
};
