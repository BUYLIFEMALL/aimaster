import { NextResponse } from 'next/server'
import { verifyExtensionToken } from '@/blog/utils/extensionAuth'
import { createAdminClient } from '@/blog/utils/supabase/admin'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

const ALLOWED_STATUSES = new Set(['in_progress', 'completed', 'publish_ready', 'failed'])

// 확장이 네이버 입력 진행 상태를 기록한다(입력 중 / 입력 완료 / 발행 설정 준비 완료 / 실패). 본인 글·보낸 글만.
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await verifyExtensionToken(request)
  if (!user) return NextResponse.json({ error: '유효하지 않은 연동 토큰이거나 이용 권한이 없습니다.' }, { status: 401 })

  const { id } = await context.params
  const postId = Number(id)
  if (!Number.isFinite(postId)) return NextResponse.json({ error: '잘못된 글 번호입니다.' }, { status: 400 })

  const input = (await request.json().catch(() => null)) as { status?: string; error?: string } | null
  const status = input?.status?.trim() ?? ''
  if (!ALLOWED_STATUSES.has(status)) return NextResponse.json({ error: '지원하지 않는 입력 상태입니다.' }, { status: 400 })

  const { data, error } = await createAdminClient()
    .from('tistory_posts')
    .update({
      tistory_input_status: status,
      tistory_input_completed_at: status === 'completed' || status === 'publish_ready' ? new Date().toISOString() : null,
      tistory_input_error: input?.error?.trim().slice(0, 500) || null,
    })
    .eq('id', postId)
    .eq('user_id', user.userId)
    .not('extension_handoff_at', 'is', null)
    .select('id, tistory_input_status')
    .maybeSingle()
  if (error) return NextResponse.json({ error: '입력 결과 기록에 실패했습니다.' }, { status: 500 })
  if (!data) return NextResponse.json({ error: '기록할 수 있는 내 글을 찾지 못했습니다.' }, { status: 404 })
  return NextResponse.json({ result: data })
}
