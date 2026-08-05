import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { checkProgramAccess } from '@/lib/access/checkProgramAccess'
import { mdLiteToHtml } from '@/utils/markdown'

const BLOG_PROGRAM_SLUG = 'ai-auto-blog'

/** PUT/DELETE 전에 로그인 + "ai-auto-blog" 프로그램 이용 권한을 확인한다. */
async function requireBlogProgramAccess() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false as const, error: '로그인이 필요합니다.', status: 401 }
  }

  const access = await checkProgramAccess(supabase, user.id, BLOG_PROGRAM_SLUG)
  if (!access.allowed) {
    return { ok: false as const, error: 'AI 자동 블로그 이용 권한이 없습니다. 구독 후 이용해주세요.', status: 403 }
  }

  return { ok: true as const, userId: user.id }
}

/**
 * V8 정규식 백트래킹 오버플로우를 100% 방지하는 Non-Regex Pure String 이미지 추출 함수
 */
function extractBase64ImagesPureString(htmlContent: string): string[] {
  if (!htmlContent) return []
  const images: string[] = []
  let searchIndex = 0

  while (true) {
    const startIdx = htmlContent.indexOf('data:image/', searchIndex)
    if (startIdx === -1) break

    let endIdx = htmlContent.indexOf('"', startIdx)
    const endAltIdx = htmlContent.indexOf(')', startIdx)

    if (endIdx === -1 || (endAltIdx !== -1 && endAltIdx < endIdx)) {
      endIdx = endAltIdx
    }

    if (endIdx === -1) {
      endIdx = Math.min(htmlContent.length, startIdx + 10000)
    }

    const b64Src = htmlContent.slice(startIdx, endIdx)
    images.push(b64Src)
    searchIndex = endIdx
  }

  return images
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const postId = Number(id)

    if (isNaN(postId)) {
      return NextResponse.json({ error: '유효하지 않은 게시글 ID입니다.' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: post, error } = await supabase
      .from('blog_posts')
      .select(`
        id,
        title,
        excerpt,
        content,
        reading_minutes,
        published_at,
        created_at,
        blog_authors (
          id,
          name,
          role,
          avatar_url
        ),
        blog_post_categories (
          blog_categories (
            id,
            name,
            slug
          )
        )
      `)
      .eq('id', postId)
      .single()

    if (error || !post) {
      return NextResponse.json({ error: '게시글을 찾을 수 없습니다.' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: post })
  } catch (err: any) {
    return NextResponse.json({ error: '서버 내부 오류가 발생했습니다.', message: err?.message }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireBlogProgramAccess()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { id } = await params
    const postId = Number(id)

    if (isNaN(postId)) {
      return NextResponse.json({ error: '유효하지 않은 게시글 ID입니다.' }, { status: 400 })
    }

    const body = await request.json()
    const { title, excerpt, content, categoryId } = body

    if (!title || !title.trim()) {
      return NextResponse.json({ error: '제목을 입력해 주세요.' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // 1. 기존 DB의 포스트 데이터 조용히 가져오기
    const { data: existingPost, error: fetchErr } = await supabase
      .from('blog_posts')
      .select('content, user_id')
      .eq('id', postId)
      .single()

    if (fetchErr || !existingPost) {
      console.error('[Post Edit API Fetch Error]:', fetchErr)
      return NextResponse.json({ error: '기존 게시글 정보를 불러올 수 없습니다.', details: fetchErr }, { status: 404 })
    }

    if (existingPost.user_id && existingPost.user_id !== auth.userId) {
      return NextResponse.json({ error: '본인이 작성한 게시글만 수정할 수 있습니다.' }, { status: 403 })
    }

    // 2. V8 정규식 백트래킹이 전면 방지되는 비-정규식 Pure String 파서로 원본 이미지 바이너리 추출
    const existingImages = extractBase64ImagesPureString(existingPost.content || '')

    // 3. 수신한 텍스트의 [첨부이미지 N] 키에 기존 이미지 바이너리 1:1 결합
    let finalMarkdown = content || ''
    existingImages.forEach((imgSrc, idx) => {
      const key = `[첨부이미지 ${idx + 1}]`
      finalMarkdown = finalMarkdown.split(key).join(imgSrc)
    })

    // 4. 최종 마크다운 ➔ HTML 변환
    const finalHtml = mdLiteToHtml(finalMarkdown)

    // 5. DB 업데이트
    const { data: updatedPost, error: updateErr } = await supabase
      .from('blog_posts')
      .update({
        title: title.trim(),
        excerpt: excerpt ? excerpt.trim() : '',
        content: finalHtml,
      })
      .eq('id', postId)
      .select('id, title, excerpt')
      .single()

    if (updateErr || !updatedPost) {
      console.error('[Post Edit API Update Error]:', updateErr)
      return NextResponse.json({ error: '게시글 DB 수정 저장 중 오류가 발생했습니다.', details: updateErr }, { status: 500 })
    }

    // ★ 카테고리 매핑 업데이트 (기존 매핑 삭제 후 신규 매핑 등록)
    if (categoryId !== undefined && categoryId !== null) {
      await supabase.from('blog_post_categories').delete().eq('post_id', postId)
      if (Number(categoryId) > 0) {
        const { error: catErr } = await supabase
          .from('blog_post_categories')
          .insert([{ post_id: postId, category_id: Number(categoryId) }])
        if (catErr) {
          console.error('[Category Update Error]:', catErr)
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: '게시글이 성공적으로 수정되었습니다.',
      data: updatedPost,
    })
  } catch (err: any) {
    console.error('[Post Edit PUT Exception]:', err)
    return NextResponse.json({
      error: '서버 내부 오류가 발생했습니다.',
      message: err?.message,
      details: String(err),
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireBlogProgramAccess()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { id } = await params
    const postId = Number(id)

    if (isNaN(postId)) {
      return NextResponse.json({ error: '유효하지 않은 게시글 ID입니다.' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // 0. 본인 게시글인지 확인 (레거시 글처럼 user_id가 없는 경우는 그대로 허용)
    const { data: targetPost } = await supabase
      .from('blog_posts')
      .select('user_id')
      .eq('id', postId)
      .maybeSingle()

    if (targetPost?.user_id && targetPost.user_id !== auth.userId) {
      return NextResponse.json({ error: '본인이 작성한 게시글만 삭제할 수 있습니다.' }, { status: 403 })
    }

    // 1. 연관 카테고리 매핑 삭제
    await supabase.from('blog_post_categories').delete().eq('post_id', postId)

    // 2. 게시글 본체 삭제
    const { error } = await supabase.from('blog_posts').delete().eq('id', postId)

    if (error) {
      console.error('[Post Delete API Error]:', error)
      return NextResponse.json({ error: '게시글 삭제 중 오류가 발생했습니다.', details: error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: '게시글이 성공적으로 삭제되었습니다.',
    })
  } catch (err: any) {
    return NextResponse.json({ error: '서버 내부 오류가 발생했습니다.', message: err?.message }, { status: 500 })
  }
}
