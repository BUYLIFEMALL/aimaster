import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/blog/utils/supabase/middleware'

// 2026-10-16 도메인 통일(SSO): 옛 *.vercel.app 주소로 들어온 화면 요청은 새 주소로 보낸다(로그인 쿠키는 .buylife.xyz에서만 공유).
// API는 옮기지 않는다(옛 주소의 크론·외부 호출·확장이 그대로 동작, 옛 주소는 지우지 않음).
const NEW_ORIGIN = "https://tistory-auto-blog.buylife.xyz";

export async function proxy(request: NextRequest) {
  const reqHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  if (reqHost.endsWith(".vercel.app") && !request.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.redirect(`${NEW_ORIGIN}${request.nextUrl.pathname}${request.nextUrl.search}`, 308);
  }
  // 로컬에서 UI 시안을 확인할 때는 별도 Supabase 환경값을 만들지 않는다.
  // 이 경로는 정적 시안 전용이며, 실제 기능·데이터·인증에는 접근하지 않는다.
  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim())
  )

  if (!hasSupabaseConfig && request.nextUrl.pathname.startsWith('/preview')) {
    return NextResponse.next({ request })
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
