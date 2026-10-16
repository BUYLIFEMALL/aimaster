import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { cookieDomainForHost } from './cookieDomain'

export async function updateSession(request: NextRequest) {
  // utils/access.ts가 비로그인 사용자를 /auth?redirect=<현재 경로>로 보낼 때 쓴다.
  request.headers.set('x-pathname', request.nextUrl.pathname + request.nextUrl.search)

  // 2026-10-16 도메인 통일(SSO): *.buylife.xyz에서는 로그인 쿠키를 .buylife.xyz로 공유
  const cookieDomain = cookieDomainForHost(request.headers.get('x-forwarded-host') ?? request.headers.get('host'))

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim())!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )

          supabaseResponse = NextResponse.next({
            request,
          })

          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, cookieDomain ? { ...options, domain: cookieDomain } : options)
          )
        },
      },
    }
  )

  // Do not run code between createServerClient and getUser. A simple mistake can write
  // security vulnerabilities.
  await supabase.auth.getUser()

  // 이 미들웨어에서는 단순히 쿠키 갱신만 처리하며 특정 리다이렉트 보호 로직은 Route & Page 레벨에서 처리합니다.
  // URL 패턴상 auth/confirm 및 auth 세션 갱신을 위해 통과시킵니다.
  return supabaseResponse
}
