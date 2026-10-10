import { verifyExtensionToken } from '@/blog/utils/extensionAuth'
import { createAdminClient } from '@/blog/utils/supabase/admin'
import { ALLOWED_PREVIOUS, isInputStatus, leaseExpiry, type InputStatus } from '@/blog/utils/extensionTask'
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

  const input = (await request.json().catch(() => null)) as { status?: string; error?: string; runId?: string } | null
  const runId = typeof input?.runId === 'string' ? input.runId.trim() : ''
  const status = input?.status?.trim() ?? ''
  if (!isInputStatus(status)) return privateJson({ error: '지원하지 않는 입력 상태입니다.' }, { status: 400 })

  try {
    const supabase = createAdminClient()
    const { data: current, error: readError } = await supabase
      .from('blog_posts')
      .select('id, naver_input_status, naver_run_id')
      .eq('id', postId)
      .eq('user_id', user.userId)
      .not('extension_handoff_at', 'is', null)
      .maybeSingle()
    if (readError) return privateJson({ error: '입력 결과 기록 상태를 확인하지 못했습니다.' }, { status: 503 })
    if (!current) return privateJson({ error: '기록할 수 있는 내 글을 찾지 못했습니다.' }, { status: 404 })

    // 실행 번호(v1.43): 번호가 있는 보고는 지금 이 글의 실행과 같을 때만 받는다. 웹에서 글이 다시 보내져 새 실행이 시작됐다면 옛 실행의 보고는 거절한다.
    // 번호 없이 보내는 옛 확장(v1.42 이하)의 보고는 예전 규칙(허용된 상태 이동)만 적용한다.
    if (runId && current.naver_run_id !== runId) {
      return privateJson({ error: '이 보고는 이미 끝났거나 대체된 실행의 결과입니다. 웹에서 글이 다시 보내졌을 수 있습니다.', superseded: true }, { status: 409 })
    }
    const previous = (current.naver_input_status ?? null) as InputStatus | null
    if (previous === status) return privateJson({ success: true, persisted: true, postId, status, runId: current.naver_run_id ?? null, unchanged: true, result: { id: postId, naver_input_status: status } })
    if (!ALLOWED_PREVIOUS[status].includes(previous)) {
      return privateJson({ error: '이 글의 현재 상태에서는 이 결과를 기록할 수 없습니다. 웹에서 글이 다시 보내졌거나 취소됐을 수 있습니다.', currentStatus: previous }, { status: 409 })
    }

    let update = supabase
      .from('blog_posts')
      .update({
        naver_input_status: status,
        naver_input_completed_at: status === 'completed' || status === 'publish_ready' ? new Date().toISOString() : null,
        naver_input_error: status === 'failed' ? input?.error?.trim().slice(0, 500) || null : null,
        // 입력이 끝나면(발행 준비 완료·실패) 임대를 비우고, 입력 완료 직후에는 발행 설정 단계 동안 임대를 이어 간다.
        // 번호 없이 시작하는 옛 확장은 실행 번호도 비운다(예전 규칙으로 동작).
        naver_lease_expires_at: status === 'publish_ready' || status === 'failed' ? null : runId ? leaseExpiry() : null,
        ...(status === 'in_progress' && !runId ? { naver_run_id: null } : {}),
      })
      .eq('id', postId)
      .eq('user_id', user.userId)
      .not('extension_handoff_at', 'is', null)
    // 읽은 뒤 다른 곳에서 상태가 바뀌었다면 덮어쓰지 않는다.
    update = previous === null ? update.is('naver_input_status', null) : update.eq('naver_input_status', previous)
    const { data: saved, error: writeError } = await update.select('id, naver_input_status').maybeSingle()
    if (writeError) return privateJson({ error: '입력 결과 기록에 실패했습니다.' }, { status: 503 })
    if (!saved || saved.naver_input_status !== status) return privateJson({ error: '글 상태가 그 사이 바뀌어 결과를 기록하지 못했습니다.', currentStatus: previous }, { status: 409 })
    return privateJson({ success: true, persisted: true, postId, status: saved.naver_input_status, runId: runId || null, result: saved })
  } catch {
    return privateJson({ error: '입력 결과 기록 중 서버 오류가 발생했습니다.' }, { status: 503 })
  }
}
