import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/blog/utils/supabase/admin'
import { checkProgramAccessApi } from '@/blog/utils/access'
import { resolveApiKey } from '@/blog/utils/apiKeys'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

import {
  newsblurLogin,
  fetchNewsblurStories,
  structureBlogCandidates,
  type BlogCandidateDraft,
} from '@/blog/utils/ai/collector'

async function insertCandidates(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  sourceInput: string,
  drafts: BlogCandidateDraft[],
) {
  const now = Date.now()
  const { error } = await supabase.from('blog_candidates').insert(
    drafts.map((d, i) => ({
      user_id: userId,
      source_type: 'rss' as const,
      source_input: sourceInput,
      title: d.title,
      summary: d.summary ?? '',
      keywords: d.keywords ?? [],
      created_at: new Date(now - i).toISOString(),
    })),
  )
  if (error) throw new Error(error.message)
}

/** 방식 2: RSS(NewsBlur) — 연결된 NewsBlur 계정에서 선택한 구독 피드의 최근 글로 블로그 주제 후보를 생성한다. */
export async function POST(request: NextRequest) {
  const access = await checkProgramAccessApi()
  if (!access.allowed) {
    return NextResponse.json({ error: access.error }, { status: access.status })
  }
  const user = access.user

  const body = await request.json()
  const feedId = String(body.feedId ?? '').trim()
  const feedTitle = String(body.feedTitle ?? '').trim()
  if (!feedId) {
    return NextResponse.json({ error: '구독 피드를 선택해주세요.' }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()
    const { data: account } = await supabase
      .from('newsblur_accounts')
      .select('username, password')
      .eq('user_id', user.id)
      .maybeSingle()
    if (!account) {
      return NextResponse.json({ error: '먼저 NewsBlur 계정을 연결해주세요.' }, { status: 400 })
    }

    const apiKey = (await resolveApiKey(supabase, user.id, 'openai')) ?? ''
    const sessionCookie = await newsblurLogin(account.username, account.password)
    const items = await fetchNewsblurStories(sessionCookie, feedId, 5)
    if (items.length === 0) {
      return NextResponse.json({ error: '가져올 글이 없습니다.' }, { status: 404 })
    }

    const rawText = items.map((item, i) => `[${i + 1}] ${item.title}\n${item.text}\n출처: ${item.link}`).join('\n\n')
    const drafts = await structureBlogCandidates({ rawText, maxItems: items.length, apiKey })
    await insertCandidates(supabase, user.id, feedTitle || feedId, drafts)
    return NextResponse.json({ success: true, count: drafts.length })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.' },
      { status: 500 },
    )
  }
}
