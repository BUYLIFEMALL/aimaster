import { NextResponse } from 'next/server'
import { createAdminClient } from '@/blog/utils/supabase/admin'
import { checkProgramAccessApi } from '@/blog/utils/access'
import { newsblurLogin, fetchNewsblurFeeds } from '@/blog/utils/ai/collector'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

/** 연결된 NewsBlur 계정의 구독 피드 목록을 가져온다. */
export async function GET() {
  const access = await checkProgramAccessApi()
  if (!access.allowed) {
    return NextResponse.json({ error: access.error }, { status: access.status })
  }
  const user = access.user

  const supabase = createAdminClient()
  const { data: account } = await supabase
    .from('newsblur_accounts')
    .select('username, password')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!account) {
    return NextResponse.json({ connected: false, feeds: [] })
  }

  try {
    const sessionCookie = await newsblurLogin(account.username, account.password)
    const feeds = await fetchNewsblurFeeds(sessionCookie)
    return NextResponse.json({ connected: true, username: account.username, feeds })
  } catch (err) {
    return NextResponse.json({
      connected: true,
      username: account.username,
      feeds: [],
      error: err instanceof Error ? err.message : 'NewsBlur 구독 피드 목록을 불러오지 못했습니다.',
    })
  }
}
