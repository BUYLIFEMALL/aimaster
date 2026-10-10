import { NextResponse } from 'next/server'
import { checkProgramAccessApi } from '@/blog/utils/access'
import { createAdminClient } from '@/blog/utils/supabase/admin'
import { AUTO_START_WINDOW_MS, isRunActive } from '@/blog/utils/extensionTask'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

// 글 보기 화면의 "네이버 입력기로 보내기" — 이 글을 BLOG 크롬 확장의 "자동 입력 대기"로 올린다(본인 글만, 이용 권한 확인).
// 확장이 켜져 있으면 보낸 뒤 30분 안에 가져가 네이버 편집기 입력을 자동으로 시작한다(v1.40). 30분이 지나면 확장 목록에서 직접 시작한다.
// 다시 보내면 입력 상태를 지우고 목록 맨 위로 올린다. 단, 지금 입력 중인 글은 덮어쓰지 않는다.
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await checkProgramAccessApi()
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status })

  const { id } = await context.params
  const postId = Number(id)
  if (!Number.isSafeInteger(postId) || postId <= 0) return NextResponse.json({ error: '잘못된 글 번호입니다.' }, { status: 400 })

  const supabase = createAdminClient()
  const { data: current, error: readError } = await supabase
    .from('blog_posts')
    .select('id, naver_input_status, extension_handoff_at, naver_lease_expires_at')
    .eq('id', postId)
    .eq('user_id', access.user.id)
    .maybeSingle()
  if (readError) return NextResponse.json({ error: '네이버 입력기로 보내기에 실패했습니다.' }, { status: 500 })
  if (!current) return NextResponse.json({ error: '본인이 작성한 글만 보낼 수 있습니다.' }, { status: 403 })

  // 살아 있는 실행(임대가 남은 입력 중)이 있으면 덮어쓰지 않는다. 임대가 끝난 실행(PC 꺼짐·확장 종료)은 다시 보낼 수 있다.
  if (isRunActive(current)) {
    return NextResponse.json({ error: '이 글은 지금 네이버 입력이 진행 중입니다. 입력이 끝난 뒤 다시 보내주세요.' }, { status: 409 })
  }

  const { data, error } = await supabase
    .from('blog_posts')
    .update({
      extension_handoff_at: new Date().toISOString(),
      naver_input_status: null,
      naver_input_completed_at: null,
      naver_input_error: null,
      naver_run_id: null,
      naver_lease_expires_at: null,
    })
    .eq('id', postId)
    .eq('user_id', access.user.id)
    .select('id, extension_handoff_at')
    .maybeSingle()
  if (error) return NextResponse.json({ error: '네이버 입력기로 보내기에 실패했습니다.' }, { status: 500 })
  if (!data) return NextResponse.json({ error: '본인이 작성한 글만 보낼 수 있습니다.' }, { status: 403 })
  // ok는 글쓰기 화면(app/write/ai-form)이 확인하는 값, success는 글 보기 화면과 옛 응답 호환용이다.
  return NextResponse.json({ ok: true, success: true, handoffAt: data.extension_handoff_at, autoStartMinutes: AUTO_START_WINDOW_MS / 60000 })
}
