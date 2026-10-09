import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/blog/utils/supabase/admin'
import { collect24HourNews } from '@/blog/utils/news/collector'
import { generateSeoPost, AutoPostOptions } from '@/blog/utils/news/generator'
import { mdLiteToHtml, estimateReadingMinutes } from '@/blog/utils/markdown'
import { checkProgramAccessApi } from '@/blog/utils/access'
import { resolveApiKey } from '@/blog/utils/apiKeys'
import {
  CONTENT_PROVIDER_LABELS,
  DEFAULT_CONTENT_PROVIDER,
  isContentProvider,
  resolveContentModel,
  resolveImageCount,
  resolveImageModel,
  type ContentProvider,
} from '@/blog/utils/ai/contentModels'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
// 글 + 이미지 최대 5장을 한 번에 만들어서 오래 걸릴 수 있다(2026-10-01) — Vercel 최대 시간
export const maxDuration = 300

// 'buylife.blog'처럼 https:// 없이 온 주소에 https://를 붙인다(작성 화면과 같은 규칙).
function normalizeCtaUrl(value: unknown): string {
  const v = typeof value === 'string' ? value.trim() : ''
  if (!v || v === '#') return '#'
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(v)) return v
  return 'https://' + v.replace(/^\/+/, '')
}

interface SavePostParams {
  supabase: any
  userId: string
  title: string
  excerpt: string
  contentHtml: string
  readingMinutes: number
  categorySlugs: string[]
  postId?: number
}

async function savePostToDatabase({
  supabase,
  userId,
  title,
  excerpt,
  contentHtml,
  readingMinutes,
  categorySlugs,
  postId,
}: SavePostParams) {
  // 기존 게시글 업데이트 모드인 경우
  if (postId && Number(postId) > 0) {
    const { data: updatedPost, error: updateError } = await supabase
      .from('blog_posts')
      .update({
        title,
        excerpt,
        content: contentHtml,
        reading_minutes: readingMinutes,
      })
      .eq('id', Number(postId))
      .eq('user_id', userId)
      .select('id, title, published_at')
      .single()

    if (updateError || !updatedPost) {
      console.error('[AutoPost API] DB update error:', updateError)
      return {
        error: `게시글 수정 저장 오류: ${updateError?.message || '알 수 없는 오류'}`,
        details: updateError,
      }
    }

    return { post: updatedPost }
  }

  // 1. 저자 ID 확보 — 게시글은 이제 작성한 AIMaster 회원 본인 명의로 귀속된다
  let authorId: number
  const { data: ownAuthor } = await supabase
    .from('blog_authors')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (ownAuthor) {
    authorId = ownAuthor.id
  } else {
    const { data: profile } = await supabase
      .from('profiles')
      .select('name, email')
      .eq('id', userId)
      .maybeSingle()
    const displayName = profile?.name || profile?.email?.split('@')[0] || '회원'

    const { data: createdAuthor, error: authorError } = await supabase
      .from('blog_authors')
      .insert({ name: displayName, role: '작성자', user_id: userId })
      .select('id')
      .single()

    if (authorError || !createdAuthor) {
      console.error('[AutoPost API] 저자 프로필 생성 오류:', authorError)
      return { error: '작성자 프로필 생성 중 오류가 발생했습니다.', details: authorError }
    }
    authorId = createdAuthor.id
  }

  // 2. 카테고리 매핑
  let targetCategoryIds: number[] = []
  if (categorySlugs.length > 0) {
    const { data: matchedCats } = await supabase
      .from('blog_categories')
      .select('id')
      .in('slug', categorySlugs)

    if (matchedCats && matchedCats.length > 0) {
      targetCategoryIds = matchedCats.map((c: any) => c.id)
    }
  }

  if (targetCategoryIds.length === 0) {
    const { data: firstCategory } = await supabase.from('blog_categories').select('id').limit(1).single()
    if (firstCategory?.id) targetCategoryIds.push(firstCategory.id)
  }

  // 3. blog_posts 테이블에 등록
  const { data: createdPost, error: postError } = await supabase
    .from('blog_posts')
    .insert({
      title,
      excerpt,
      content: contentHtml,
      author_id: authorId,
      user_id: userId,
      reading_minutes: readingMinutes,
    })
    .select('id, title, published_at')
    .single()

  if (postError || !createdPost) {
    console.error('[AutoPost API] DB insert error:', postError)
    return {
      error: `게시글 DB 저장 오류: ${postError?.message || '알 수 없는 오류'}`,
      details: postError,
    }
  }

  // 4. blog_post_categories 다중 매핑 등록
  if (targetCategoryIds.length > 0) {
    const pcRows = targetCategoryIds.map((cid) => ({
      post_id: createdPost.id,
      category_id: cid,
    }))
    await supabase.from('blog_post_categories').insert(pcRows)
  }

  return { post: createdPost }
}

export async function POST(request: NextRequest) {
  try {
    const access = await checkProgramAccessApi()
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }
    const user = access.user

    const body = await request.json()

    // 0. [편집 완료 후 DB 저장 전용 모드] (saveOnly 또는 mode === 'save')
    if (body.saveOnly || body.mode === 'save') {
      const title = String(body.title || '').trim()
      if (!title) {
        return NextResponse.json({ error: '게시글 제목을 입력해주세요.' }, { status: 400 })
      }
      const excerpt = String(body.excerpt || '').trim()
      const contentHtml = body.contentHtml || (body.contentMarkdown ? mdLiteToHtml(body.contentMarkdown) : '')
      if (!contentHtml) {
        return NextResponse.json({ error: '게시글 본문 내용을 입력해주세요.' }, { status: 400 })
      }
      const readingMinutes = body.readingMinutes
        ? Number(body.readingMinutes)
        : estimateReadingMinutes(body.contentMarkdown || contentHtml)

      const requestCategorySlugs: string[] = Array.isArray(body.category_slugs)
        ? body.category_slugs
        : Array.isArray(body.categorySlugs)
        ? body.categorySlugs
        : body.category_slug || body.categorySlug
        ? [body.category_slug || body.categorySlug]
        : []

      const supabase = createAdminClient()
      const saveResult = await savePostToDatabase({
        supabase,
        userId: user.id,
        title,
        excerpt,
        contentHtml,
        readingMinutes,
        categorySlugs: requestCategorySlugs,
        postId: body.postId ? Number(body.postId) : undefined,
      })

      if (saveResult.error || !saveResult.post) {
        return NextResponse.json({ error: saveResult.error, details: saveResult.details }, { status: 500 })
      }

      const postUrl = `/posts/${saveResult.post.id}`
      return NextResponse.json({
        success: true,
        message: '수정한 블로그 글이 성공적으로 등록되었습니다.',
        data: {
          postId: saveResult.post.id,
          postUrl,
          title: saveResult.post.title,
          publishedAt: saveResult.post.published_at,
        },
      })
    }

    // 설정(API키등록·플랫폼연동)에 등록한 본인 키만 사용한다(앱 공용 키 폴백 없음, 2026-08-12 정책).
    // 2026-10-01 주인님 지시로 "이번 글에만 쓸 키·커스텀 엔드포인트" 입력 기능을 없앴다.
    const adminClient = createAdminClient()
    const resolvedApiKey = (await resolveApiKey(adminClient, user.id, 'gemini')) || undefined

    // 본문 생성 플랫폼·모델(OpenAI/Claude/Gemini 중 회원 선택, 2026-10-01 — SEO 스튜디오와 같은 선택지).
    const contentProvider: ContentProvider = isContentProvider(body.contentProvider) ? body.contentProvider : DEFAULT_CONTENT_PROVIDER
    const contentModel = resolveContentModel(contentProvider, body.contentModel)
    const contentApiKey =
      contentProvider === 'gemini' ? resolvedApiKey : (await resolveApiKey(adminClient, user.id, contentProvider)) || undefined

    // 본인 키가 없으면 여기서 멈춘다.
    if (!contentApiKey) {
      return NextResponse.json(
        {
          code: 'API_KEY_REQUIRED',
          error: `본문 생성에 쓸 ${CONTENT_PROVIDER_LABELS[contentProvider]} API 키가 없습니다. 설정 페이지(API키등록·플랫폼연동)에서 본인 키를 등록해주세요.`,
        },
        { status: 400 },
      )
    }
    if (!resolvedApiKey) {
      return NextResponse.json(
        {
          code: 'API_KEY_REQUIRED',
          error: '이미지 생성(나노바나나)에 쓸 Google Gemini API 키가 없습니다. 설정 페이지(API키등록·플랫폼연동)에서 본인 키를 등록해주세요.',
        },
        { status: 400 },
      )
    }

    // 단일 topic 또는 세부 options 객체 수신 지원
    const options: AutoPostOptions = {
      topic: body.topic || body.keyword || body.query || '',
      categorySlug: body.category_slug || body.categorySlug,
      tone: body.tone,
      targetAudience: body.targetAudience || body.target_audience,
      wordCount: body.wordCount ? Number(body.wordCount) : body.target_word_count ? Number(body.target_word_count) : undefined,
      keywords: Array.isArray(body.keywords) ? body.keywords : body.keywords ? [body.keywords] : undefined,
      referenceUrls: Array.isArray(body.referenceUrls) ? body.referenceUrls : Array.isArray(body.reference_urls) ? body.reference_urls : body.referenceUrl ? [body.referenceUrl] : undefined,
      customInstructions: body.customInstructions || body.custom_prompt,
      contentProvider,
      contentModel,
      contentApiKey,
      nanoBananaApiKey: resolvedApiKey,
      imageModel: resolveImageModel(body.imageModel || body.nanoBananaModel),
      imageCount: resolveImageCount(body.imageCount),
      storageUserId: user.id,
      cta: body.cta && (body.cta.text || body.cta.url) ? { text: body.cta.text || '자세히 보기', url: normalizeCtaUrl(body.cta.url) } : undefined,
    }

    if (!options.topic || typeof options.topic !== 'string' || !options.topic.trim()) {
      return NextResponse.json(
        { error: '블로그 주제를 입력해 주세요.' },
        { status: 400 }
      )
    }

    console.log(`[AutoPost API] Generating post for topic: "${options.topic.trim()}" (Tone: ${options.tone || '기본'})`)

    // 1. 최근 24시간 뉴스 수집 및 4대 신호 분석
    const newsData = await collect24HourNews(options.topic.trim())

    // 2. 벤치마킹 옵션 반영 SEO 최적화 포스트 생성
    const postData = await generateSeoPost(newsData, options)

    // [미리보기 및 편집 전용 모드] (previewOnly 또는 mode === 'generate')
    if (body.previewOnly || body.mode === 'generate') {
      return NextResponse.json({
        success: true,
        previewOnly: true,
        data: {
          title: postData.title,
          excerpt: postData.excerpt,
          contentMarkdown: postData.contentMarkdown,
          contentHtml: postData.contentHtml,
          readingMinutes: postData.readingMinutes,
          categorySlug: postData.categorySlug,
          topKeywords: newsData.topKeywords,
          coverImage: postData.coverImage,
          sections: postData.sections,
          cta: postData.cta,
          hashtags: postData.hashtags,
          collectedNewsCount: newsData.articles.length,
          signals: newsData.signals,
          topic: options.topic,
        },
      })
    }

    // 3. Supabase DB 연동 및 저장 (기존 즉시 저장 모드)
    const requestCategorySlugs: string[] = Array.isArray(body.category_slugs)
      ? body.category_slugs
      : Array.isArray(body.categorySlugs)
      ? body.categorySlugs
      : body.category_slug || body.categorySlug
      ? [body.category_slug || body.categorySlug]
      : postData.categorySlug
      ? [postData.categorySlug]
      : []

    const supabase = createAdminClient()
    const saveResult = await savePostToDatabase({
      supabase,
      userId: user.id,
      title: postData.title,
      excerpt: postData.excerpt,
      contentHtml: postData.contentHtml,
      readingMinutes: postData.readingMinutes,
      categorySlugs: requestCategorySlugs,
    })

    if (saveResult.error || !saveResult.post) {
      return NextResponse.json(
        {
          error: '게시글 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.',
        },
        { status: 500 }
      )
    }

    const postUrl = `/posts/${saveResult.post.id}`

    console.log(`[AutoPost API] Successfully published post ID #${saveResult.post.id}: "${saveResult.post.title}"`)

    return NextResponse.json({
      success: true,
      message: '맞춤형 옵션 기반 AI 블로그 글이 성공적으로 등록되었습니다.',
      data: {
        postId: saveResult.post.id,
        postUrl,
        title: saveResult.post.title,
        excerpt: postData.excerpt,
        contentMarkdown: postData.contentMarkdown,
        contentHtml: postData.contentHtml,
        readingMinutes: postData.readingMinutes,
        categorySlug: postData.categorySlug,
        categorySlugs: requestCategorySlugs,
        coverImage: postData.coverImage,
        sections: postData.sections,
        cta: postData.cta,
        hashtags: postData.hashtags,
        topKeywords: newsData.topKeywords,
        topic: options.topic,
        collectedNewsCount: newsData.articles.length,
        signals: newsData.signals,
        publishedAt: saveResult.post.published_at,
      },
    })
  } catch (error: any) {
    console.error('[AutoPost API] Internal Server Error:', error)
    return NextResponse.json(
      { error: error?.message || '서버 내부 오류가 발생했습니다.', message: error?.message },
      { status: 500 }
    )
  }
}
