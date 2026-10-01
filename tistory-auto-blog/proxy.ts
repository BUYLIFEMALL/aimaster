import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/blog/utils/supabase/middleware'

export async function proxy(request: NextRequest) {
  // 로컬에서 UI 시안을 확인할 때는 별도 Supabase 환경값을 만들지 않는다.
  // 이 경로는 정적 시안 전용이며, 실제 기능·데이터·인증에는 접근하지 않는다.
  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
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
