import { NextRequest, NextResponse } from 'next/server'
import { checkProgramAccessApi } from '@/blog/utils/access'
import { createAdminClient } from '@/blog/utils/supabase/admin'
import { sendToWorkInbox } from '@/lib/workInbox'
import { blogPostInboxContent } from '@/blog/utils/workInboxContent'
import { IS_STANDALONE } from '@/lib/deployment'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

const PROGRAM_SLUG = 'ai-auto-blog'
const APP_URL = 'https://ai-auto-blog.buylife.xyz'
const INBOX_URL = 'https://ai-work-workspace.buylife.xyz/inbox'

// U10 2차: 글 한 건을 로그인 회원 본인의 업무 워크스페이스 「받은 업무」로 보낸다(콘텐츠 캘린더에 넣을 수 있게 구조 데이터 포함).
// 본문은 브라우저가 보낸 값이 아니라 회원 본인 글(user_id 조건)을 서버가 다시 읽어 만든다.
export async function POST(req: NextRequest) {
  if (req.headers.get('origin') !== req.nextUrl.origin) {
    return NextResponse.json({ error: '요청 출처를 확인할 수 없습니다.' }, { status: 403 })
  }
  if (IS_STANDALONE) {
    return NextResponse.json({ error: '독립 설치본에서는 업무 워크스페이스 연결을 쓸 수 없습니다.' }, { status: 404 })
  }
  const access = await checkProgramAccessApi()
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status })

  const body = (await req.json().catch(() => null)) as { id?: unknown } | null
  const postId = Number(body?.id)
  if (!Number.isSafeInteger(postId) || postId <= 0) {
    return NextResponse.json({ error: '글을 찾지 못했습니다.' }, { status: 404 })
  }

  const { data: post, error } = await createAdminClient()
    .from('blog_posts')
    .select('id, title, excerpt, content, published_at, created_at, naver_input_status, naver_input_completed_at')
    .eq('id', postId)
    .eq('user_id', access.user.id)
    .maybeSingle()
  if (error || !post) return NextResponse.json({ error: '글을 찾지 못했습니다.' }, { status: 404 })

  try {
    const content = blogPostInboxContent(post)
    await sendToWorkInbox({
      userId: access.user.id,
      sourceSlug: PROGRAM_SLUG,
      kind: 'document',
      title: content.title,
      bodyMd: content.bodyMd,
      data: content.data,
      sourceUrl: `${APP_URL}/posts/${post.id}`,
    })
    return NextResponse.json({ ok: true, title: content.title, inboxUrl: INBOX_URL }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (e) {
    const message = e instanceof Error ? e.message : '업무 워크스페이스로 보내지 못했습니다.'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
