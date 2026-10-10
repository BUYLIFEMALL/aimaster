import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/blog/utils/supabase/admin'
import { checkProgramAccessApi } from '@/blog/utils/access'
import { resolveApiKey } from '@/blog/utils/apiKeys'
import { fetchShortContext, searchYoutubeShorts, YouTubeSearchError, type ShortsOrder } from '@/blog/utils/ai/youtubeShorts'
import { analyzeShortForBlog, type ShortMeta } from '@/blog/utils/ai/shortsAnalysis'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const maxDuration = 120

// 방식 4: 유튜브 쇼츠 떡상 분석(v1.66) — 키워드로 쇼츠를 찾고(search), 터진 영상을 AI로 분석해 블로그 게시글 주제 후보로 저장한다(analyze).
// 회원 본인의 YouTube·Gemini·OpenAI 키만 쓴다(운영자·다른 회원 키로 폴백하지 않는다). 검색 결과는 저장하지 않고, 분석을 누른 영상만 저장한다.
// 저장은 기존 표(tistory_candidates)에 source_type='http', source_input=쇼츠 주소로 한다(DB 변경 없음). 영상의 대사·자막은 저장하지 않는다.
const ORDERS: ShortsOrder[] = ['relevance', 'viewCount', 'date']
const GRADES = ['초대박', '대박', '떡상', '양호', '보통', '판정불가']
const VIDEO_ID = /^[\w-]{11}$/
const DAY = /^\d{4}-\d{2}-\d{2}$/
const SHORTS_URL = (id: string) => `https://www.youtube.com/shorts/${id}`

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })
const number = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0)
const nullableNumber = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null)
const clean = (value: unknown, max: number) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '')

/** 화면이 키 등록 여부에 맞춰 안내를 보여 주도록 알려 준다(키 값은 돌려주지 않는다). */
export async function GET() {
  const access = await checkProgramAccessApi()
  if (!access.allowed) return json({ error: access.error }, access.status)
  const supabase = createAdminClient()
  const [youtube, gemini, openai] = await Promise.all([
    resolveApiKey(supabase, access.user.id, 'youtube_api_key'),
    resolveApiKey(supabase, access.user.id, 'gemini'),
    resolveApiKey(supabase, access.user.id, 'openai'),
  ])
  return json({ hasYoutubeKey: Boolean(youtube), hasGeminiKey: Boolean(gemini), hasOpenaiKey: Boolean(openai) })
}

export async function POST(request: NextRequest) {
  const access = await checkProgramAccessApi()
  if (!access.allowed) return json({ error: access.error }, access.status)
  const user = access.user

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body || typeof body !== 'object') return json({ error: '요청 형식이 올바르지 않습니다.' }, 400)

  try {
    const supabase = createAdminClient()
    const youtubeKey = await resolveApiKey(supabase, user.id, 'youtube_api_key')

    // ---- 검색 ----
    if (body.action === 'search') {
      const query = clean(body.query, 100)
      if (!query) return json({ error: '검색어를 입력해 주세요.' }, 400)
      if (!youtubeKey) return json({ error: '유튜브 검색을 위해 본인의 YouTube Data API v3 키가 필요합니다. [API키등록·플랫폼연동]에서 등록해 주세요.', needKey: true }, 400)
      const dateFrom = typeof body.dateFrom === 'string' && DAY.test(body.dateFrom) ? body.dateFrom : undefined
      const dateTo = typeof body.dateTo === 'string' && DAY.test(body.dateTo) ? body.dateTo : undefined
      const order = ORDERS.includes(body.order as ShortsOrder) ? (body.order as ShortsOrder) : 'viewCount'
      const videos = await searchYoutubeShorts({ query, dateFrom, dateTo, order }, youtubeKey)
      return json({ success: true, videos })
    }

    // ---- 분석 → 주제 후보 저장 ----
    if (body.action === 'analyze') {
      const raw = (body.video ?? {}) as Record<string, unknown>
      const id = typeof raw.id === 'string' ? raw.id : ''
      if (!VIDEO_ID.test(id)) return json({ error: '영상 정보가 올바르지 않습니다.' }, 400)
      const meta: ShortMeta = {
        id,
        title: clean(raw.title, 200) || '(제목 없음)',
        channelName: clean(raw.channelName, 100) || '(채널 정보 없음)',
        views: number(raw.views),
        subs: nullableNumber(raw.subs),
        vsRatio: nullableNumber(raw.vsRatio),
        grade: GRADES.includes(raw.grade as string) ? (raw.grade as string) : '판정불가',
        publishedAt: clean(raw.publishedAt, 40),
      }

      let categoryId: number | null = null
      if (body.categoryId !== undefined && body.categoryId !== null && body.categoryId !== '') {
        categoryId = Number(body.categoryId)
        if (!Number.isSafeInteger(categoryId) || categoryId <= 0) return json({ error: '카테고리가 올바르지 않습니다.' }, 400)
        const { data: category, error: categoryError } = await supabase.from('tistory_categories').select('id').eq('id', categoryId).eq('user_id', user.id).maybeSingle()
        if (categoryError) return json({ error: '카테고리를 확인하지 못했습니다.' }, 500)
        if (!category) return json({ error: '본인의 카테고리만 지정할 수 있습니다.' }, 400)
      }

      // 같은 영상을 이미 분석했으면 AI 호출 전에 막아 중복 비용을 방지한다.
      const { data: existing, error: existingError } = await supabase.from('tistory_candidates').select('id').eq('user_id', user.id).eq('source_input', SHORTS_URL(id)).limit(1)
      if (existingError) return json({ error: '저장된 글감을 확인하지 못했습니다.' }, 500)
      if (existing && existing.length) return json({ error: '이미 분석해서 저장한 영상입니다. 아래 수집한 주제 목록을 확인해 주세요.', duplicate: true }, 409)

      const geminiKey = await resolveApiKey(supabase, user.id, 'gemini')
      const openaiKey = await resolveApiKey(supabase, user.id, 'openai')
      if (!geminiKey && !openaiKey) return json({ error: '쇼츠를 분석하려면 본인의 Gemini 또는 OpenAI API 키가 필요합니다. [API키등록·플랫폼연동]에서 등록해 주세요.', needKey: true }, 400)

      // YouTube 키가 있으면 설명·댓글도 근거로 쓰고(약 2유닛), 없어도 분석은 동작한다.
      const extra = youtubeKey ? await fetchShortContext(id, youtubeKey) : { description: '', comments: [] as string[] }
      const analysis = await analyzeShortForBlog({ meta, extra, geminiKey, openaiKey })

      const now = Date.now()
      const analysisLine = [analysis.hook && `훅: ${analysis.hook}`, analysis.whyViral && `터진 이유: ${analysis.whyViral}`].filter(Boolean).join(' / ')
      const { error: insertError } = await supabase.from('tistory_candidates').insert(
        analysis.candidates.map((draft, index) => ({
          user_id: user.id,
          source_type: 'http' as const,
          source_input: SHORTS_URL(id),
          title: draft.title,
          summary: analysisLine ? `[영상 분석] ${analysisLine}\n\n${draft.summary ?? ''}`.trim() : (draft.summary ?? ''),
          keywords: draft.keywords ?? [],
          category_id: categoryId,
          created_at: new Date(now - index).toISOString(),
        })),
      )
      if (insertError) return json({ error: '분석은 끝났지만 글감을 저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요.' }, 500)
      return json({ success: true, count: analysis.candidates.length, evidence: analysis.evidence, note: analysis.note ?? null })
    }

    return json({ error: '알 수 없는 요청입니다.' }, 400)
  } catch (error) {
    if (error instanceof YouTubeSearchError) return json({ error: error.message, needKey: error.invalidKey }, 400)
    return json({ error: error instanceof Error && error.message ? error.message : '쇼츠 분석 중 오류가 발생했습니다.' }, 500)
  }
}
