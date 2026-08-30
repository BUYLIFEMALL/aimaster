import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/blog/utils/supabase/admin'
import { checkProgramAccessApi } from '@/blog/utils/access'
import { resolveApiKey } from '@/blog/utils/apiKeys'

export const dynamic = 'force-dynamic'
import { searchPerplexityTrending, structureBlogCandidates, type BlogCandidateDraft } from '@/blog/utils/ai/collector'

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
      source_type: 'perplexity' as const,
      source_input: sourceInput,
      title: d.title,
      summary: d.summary ?? '',
      keywords: d.keywords ?? [],
      created_at: new Date(now - i).toISOString(),
    })),
  )
  if (error) throw new Error(error.message)
}

/** 방식 3: Perplexity — 시드 주제로 현재 트렌딩 앵글을 찾아 블로그 주제 후보를 생성한다. */
export async function POST(request: NextRequest) {
  const access = await checkProgramAccessApi()
  if (!access.allowed) {
    return NextResponse.json({ error: access.error }, { status: access.status })
  }
  const user = access.user

  const body = await request.json()
  const topic = String(body.topic ?? '').trim()
  if (!topic) {
    return NextResponse.json({ error: '주제를 입력해주세요.' }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()
    const perplexityKey = (await resolveApiKey(supabase, user.id, 'perplexity')) ?? ''
    const openaiKey = (await resolveApiKey(supabase, user.id, 'openai')) ?? ''
    const trendText = await searchPerplexityTrending(topic, perplexityKey)
    const drafts = await structureBlogCandidates({ rawText: trendText, maxItems: 5, apiKey: openaiKey })
    await insertCandidates(supabase, user.id, topic, drafts)
    return NextResponse.json({ success: true, count: drafts.length })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.' },
      { status: 500 },
    )
  }
}
