import { NextResponse } from 'next/server'
import { verifyExtensionToken } from '@/blog/utils/extensionAuth'
import { createAdminClient } from '@/blog/utils/supabase/admin'
import { htmlToInputBlocks } from '@/blog/utils/extensionContent'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

// BLOG 크롬 확장이 불러갈 "네이버로 보낸 글" 목록(본인 글만, 최근 20개).
// 본문은 확장이 네이버 편집기에 순서대로 입력할 블록(텍스트·이미지)으로 바꿔서 준다(utils/extensionContent.ts).
export async function GET(request: Request) {
  const user = await verifyExtensionToken(request)
  if (!user) return NextResponse.json({ error: '유효하지 않은 연동 토큰이거나 이용 권한이 없습니다.' }, { status: 401 })

  const { data, error } = await createAdminClient()
    .from('blog_posts')
    .select('id, title, content, published_at, extension_handoff_at, naver_input_status')
    .eq('user_id', user.userId)
    .not('extension_handoff_at', 'is', null)
    .order('extension_handoff_at', { ascending: false })
    .limit(20)
  if (error) return NextResponse.json({ error: '보낸 글 목록을 불러오지 못했습니다.' }, { status: 500 })

  const posts = (data ?? []).map((post) => {
    const { blocks, tags } = htmlToInputBlocks(post.content || '', post.title || '')
    return {
      id: post.id,
      title: post.title,
      published_at: post.published_at,
      extension_handoff_at: post.extension_handoff_at,
      naver_input_status: post.naver_input_status,
      blocks,
      tags,
      image_count: blocks.filter((block) => block.type === 'image').length,
      text_length: blocks.reduce((sum, block) => sum + (block.type === 'text' ? block.text.length : 0), 0),
    }
  })
  return NextResponse.json({ posts })
}
