import { NextResponse } from 'next/server'
import { checkProgramAccessApi } from '@/blog/utils/access'
import { createAdminClient } from '@/blog/utils/supabase/admin'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

// 글 보기 화면의 "네이버 입력기로 보내기" — 이 글을 BLOG 크롬 확장 목록에 올린다(본인 글만, 이용 권한 확인).
// 다시 보내면 입력 상태를 지우고 목록 맨 위로 올린다.
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await checkProgramAccessApi()
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status })

  const { id } = await context.params
  const postId = Number(id)
  if (!Number.isFinite(postId)) return NextResponse.json({ error: '잘못된 글 번호입니다.' }, { status: 400 })

  const { data, error } = await createAdminClient()
    .from('blog_posts')
    .update({
      extension_handoff_at: new Date().toISOString(),
      naver_input_status: null,
      naver_input_completed_at: null,
      naver_input_error: null,
    })
    .eq('id', postId)
    .eq('user_id', access.user.id)
    .select('id, extension_handoff_at')
    .maybeSingle()
  if (error) return NextResponse.json({ error: '네이버 입력기로 보내기에 실패했습니다.' }, { status: 500 })
  if (!data) return NextResponse.json({ error: '본인이 작성한 글만 보낼 수 있습니다.' }, { status: 403 })
  return NextResponse.json({ success: true, handoffAt: data.extension_handoff_at })
}
