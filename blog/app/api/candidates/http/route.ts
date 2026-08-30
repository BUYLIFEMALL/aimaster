import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/blog/utils/supabase/admin'
import { checkProgramAccessApi } from '@/blog/utils/access'
import { resolveApiKey } from '@/blog/utils/apiKeys'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

import {
  fetchUrlText,
  fetchHtmlForLinks,
  extractArticleLinks,
  rewriteToScrapableListingUrl,
  pickRandom,
  structureBlogCandidates,
  type BlogCandidateDraft,
} from '@/blog/utils/ai/collector'

const CATEGORY_PAGE_MIN_LINKS = 3
const CATEGORY_PAGE_PICK_COUNT = 5

async function insertCandidates(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  sourceType: 'http' | 'rss' | 'perplexity',
  sourceInput: string,
  drafts: BlogCandidateDraft[],
) {
  // 한 배치로 여러 건을 insert하면 DB가 모든 행에 동일한 트랜잭션 시각을 created_at으로
  // 부여해서, "최신 생성 순" 정렬(created_at desc)이 배치 내에서는 순서를 보장하지 못한다.
  // 배치 내 순서(=생성 순서)를 유지하도록 1ms씩 차이 나는 타임스탬프를 명시적으로 부여한다.
  const now = Date.now()
  const { error } = await supabase.from('blog_candidates').insert(
    drafts.map((d, i) => ({
      user_id: userId,
      source_type: sourceType,
      source_input: sourceInput,
      title: d.title,
      summary: d.summary ?? '',
      keywords: d.keywords ?? [],
      created_at: new Date(now - i).toISOString(),
    })),
  )
  if (error) throw new Error(error.message)
}

/**
 * 방식 1: HTTP — 주어진 URL이 특정 게시글이면 그 글로 블로그 주제 1건을,
 * 여러 게시글이 나열된 카테고리/목록 페이지(예: 네이버 뉴스 섹션)면
 * 그중 무작위 5건을 골라 각각 블로그 주제를 생성한다.
 */
export async function POST(request: NextRequest) {
  const access = await checkProgramAccessApi()
  if (!access.allowed) {
    return NextResponse.json({ error: access.error }, { status: access.status })
  }
  const user = access.user

  const body = await request.json()
  const url = String(body.url ?? '').trim()
  if (!url) {
    return NextResponse.json({ error: 'URL을 입력해주세요.' }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()
    const apiKey = (await resolveApiKey(supabase, user.id, 'openai')) ?? ''
    const listingUrl = rewriteToScrapableListingUrl(url)
    const html = await fetchHtmlForLinks(listingUrl)
    const links = extractArticleLinks(html, listingUrl)

    if (links.length >= CATEGORY_PAGE_MIN_LINKS) {
      // 카테고리/목록 페이지로 판단 → 무작위 게시글 몇 건을 골라 각각 본문을 가져온다.
      const picked = pickRandom(links, CATEGORY_PAGE_PICK_COUNT)
      const articles = await Promise.all(
        picked.map(async (link) => {
          try {
            const text = await fetchUrlText(link.url, 2500)
            return { ...link, text }
          } catch {
            return null
          }
        }),
      )
      const valid = articles.filter((a): a is { url: string; title: string; text: string } => !!a)
      if (valid.length === 0) {
        return NextResponse.json({ error: '선택된 게시글 내용을 가져오지 못했습니다.' }, { status: 502 })
      }

      const rawText = valid.map((a, i) => `[${i + 1}] ${a.title}\n${a.text}\n출처: ${a.url}`).join('\n\n')
      const drafts = await structureBlogCandidates({ rawText, maxItems: valid.length, apiKey })
      await insertCandidates(supabase, user.id, 'http', url, drafts)
      return NextResponse.json({ success: true, count: drafts.length })
    }

    // 개별 게시글 페이지
    const text = await fetchUrlText(url)
    const drafts = await structureBlogCandidates({ rawText: text, maxItems: 1, apiKey })
    await insertCandidates(supabase, user.id, 'http', url, drafts)
    return NextResponse.json({ success: true, count: drafts.length })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.' },
      { status: 500 },
    )
  }
}
