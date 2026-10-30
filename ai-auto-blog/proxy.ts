import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/blog/utils/supabase/middleware'
import { IS_STANDALONE } from '@/lib/deployment'

// 2026-10-16 도메인 통일(SSO): 옛 *.vercel.app 주소로 들어온 화면 요청은 새 주소로 보낸다(로그인 쿠키는 .buylife.xyz에서만 공유).
// API는 옮기지 않는다(옛 주소의 크론·외부 호출·확장이 그대로 동작, 옛 주소는 지우지 않음).
const NEW_ORIGIN = "https://ai-auto-blog.buylife.xyz";

// 독립 운영(수강생 설치 키트, 콘텐츠 만들기 전용)에서는 크롬 확장 자동 포스팅 경로를 모두 막는다(lib/deployment.ts).
const EXTENSION_PATHS = [/^\/api\/extension(\/|$)/, /^\/api\/posts\/[^/]+\/extension-handoff$/, /^\/api\/posts\/naver-category-default$/, /^\/extension-connect(\/|$)/]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (IS_STANDALONE) {
    // 수강생 사이트는 *.vercel.app 주소라 운영 주소로 보내지 않는다.
    if (EXTENSION_PATHS.some((re) => re.test(pathname))) {
      return pathname.startsWith('/api')
        ? NextResponse.json({ error: '이 배포판은 콘텐츠 만들기 전용이라 자동 포스팅(확장 프로그램)을 지원하지 않습니다.' }, { status: 404 })
        : NextResponse.redirect(new URL('/', request.url))
    }
    return await updateSession(request)
  }
  const reqHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  if (reqHost.endsWith(".vercel.app") && !pathname.startsWith("/api")) {
    return NextResponse.redirect(`${NEW_ORIGIN}${pathname}${request.nextUrl.search}`, 308);
  }
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
