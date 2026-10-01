import { NextResponse } from 'next/server'
import { verifyExtensionToken } from '@/blog/utils/extensionAuth'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

// BLOG 크롬 확장 연결 확인 — 토큰이 유효하고 ai-auto-blog 이용 권한이 있으면 계정 이메일을 돌려준다.
export async function GET(request: Request) {
  const user = await verifyExtensionToken(request)
  if (!user) return NextResponse.json({ error: '유효하지 않은 연동 토큰이거나 이용 권한이 없습니다.' }, { status: 401 })
  return NextResponse.json({ email: user.email, name: user.name })
}
