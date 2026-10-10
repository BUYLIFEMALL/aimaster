import { verifyExtensionToken } from '@/blog/utils/extensionAuth'
import { createAdminClient } from '@/blog/utils/supabase/admin'
import { ALLOWED_PREVIOUS, isInputStatus, type InputStatus } from '@/blog/utils/extensionTask'
import { privateJson } from '@/blog/utils/privateResponse'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

// 확장이 네이버 입력 진행 상태를 기록한다(입력 중 / 입력 완료 / 발행 설정 준비 완료 / 실패). 본인 글·보낸 글만.
// 확장은 이 응답의 success·persisted·status가 모두 맞을 때만 "보고 완료"로 처리한다(v1.40).
// - DB 오류·예외는 503, 내 글이 아니거나 없으면 404, 허용되지 않는 상태 이동(늦게 도착한 옛 보고 등)은 409.
// - 같은 상태를 다시 보고하면 이미 저장된 것으로 보고 시각·오류를 바꾸지 않고 성공으로 돌려준다(응답 유실 뒤 재보고 대비).
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await verifyExtensionToken(request)
  if (!user) return privateJson({ error: '유효하지 않은 연동 토큰이거나 이용 권한이 없습니다.' }, { status: 401 })

  const { id } = await context.params
  const postId = Number(id)
  if (!Number.isSafeInteger(postId) || postId <= 0) return privateJson({ error: '잘못된 글 번호입니다.' }, { status: 400 })

  const input = (await request.json().catch(() => null)) as { status?: string; error?: string } | null
  const status = input?.status?.trim() ?? ''
  if (!isInputStatus(status)) return privateJson({ error: '지원하지 않는 입력 상태입니다.' }, { status: 400 })

  try {
    const supabase = createAdminClient()
    const { data: current, error: readError } = await supabase
      .from('blog_posts')
      .select('id, naver_input_status')
      .eq('id', postId)
      .eq('user_id', user.userId)
      .not('extension_handoff_at', 'is', null)
      .maybeSingle()
    if (readError) return privateJson({ error: '입력 결과 기록 상태를 확인하지 못했습니다.' }, { status: 503 })
    if (!current) return privateJson({ error: '기록할 수 있는 내 글을 찾지 못했습니다.' }, { status: 404 })

    const previous = (current.naver_input_status ?? null) as InputStatus | null
    if (previous === status) return privateJson({ success: true, persisted: true, postId, status, unchanged: true, result: { id: postId, naver_input_status: status } })
    if (!ALLOWED_PREVIOUS[status].includes(previous)) {
      return privateJson({ error: '이 글의 현재 상태에서는 이 결과를 기록할 수 없습니다. 웹에서 글이 다시 보내졌거나 취소됐을 수 있습니다.', currentStatus: previous }, { status: 409 })
    }

    let update = supabase
      .from('blog_posts')
      .update({
        naver_input_status: status,
        naver_input_completed_at: status === 'completed' || status === 'publish_ready' ? new Date().toISOString() : null,
        naver_input_error: status === 'failed' ? input?.error?.trim().slice(0, 500) || null : null,
      })
      .eq('id', postId)
      .eq('user_id', user.userId)
      .not('extension_handoff_at', 'is', null)
    // 읽은 뒤 다른 곳에서 상태가 바뀌었다면 덮어쓰지 않는다.
    update = previous === null ? update.is('naver_input_status', null) : update.eq('naver_input_status', previous)
    const { data: saved, error: writeError } = await update.select('id, naver_input_status').maybeSingle()
    if (writeError) return privateJson({ error: '입력 결과 기록에 실패했습니다.' }, { status: 503 })
    if (!saved || saved.naver_input_status !== status) return privateJson({ error: '글 상태가 그 사이 바뀌어 결과를 기록하지 못했습니다.', currentStatus: previous }, { status: 409 })
    return privateJson({ success: true, persisted: true, postId, status: saved.naver_input_status, result: saved })
  } catch {
    return privateJson({ error: '입력 결과 기록 중 서버 오류가 발생했습니다.' }, { status: 503 })
  }
}
