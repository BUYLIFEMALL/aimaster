import { verifyExtensionToken } from '@/blog/utils/extensionAuth'
import { createAdminClient } from '@/blog/utils/supabase/admin'
import { LEASE_MS, isRunActive, leaseExpiry, newRunId } from '@/blog/utils/extensionTask'
import { privateJson } from '@/blog/utils/privateResponse'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

// 사이드패널에서 글을 골라 "직접 시작"할 때 부르는 실행 시작(v1.43). 서버가 새 실행 번호와 임대를 정해 돌려준다.
// 살아 있는 다른 실행(임대가 남은 입력 중)이 있으면 409 — 같은 글을 두 곳에서 동시에 입력하지 못하게 한다.
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifyExtensionToken(request)
    if (!user) return privateJson({ error: '유효하지 않은 연동 토큰이거나 이용 권한이 없습니다.' }, { status: 401 })
    const { id } = await context.params
    const postId = Number(id)
    if (!Number.isSafeInteger(postId) || postId <= 0) return privateJson({ error: '잘못된 글 번호입니다.' }, { status: 400 })

    const supabase = createAdminClient()
    const { data: current, error: readError } = await supabase
      .from('blog_posts')
      .select('id, naver_input_status, naver_run_id, naver_lease_expires_at, extension_handoff_at')
      .eq('id', postId)
      .eq('user_id', user.userId)
      .not('extension_handoff_at', 'is', null)
      .maybeSingle()
    if (readError) return privateJson({ error: '글 상태를 확인하지 못했습니다.' }, { status: 503 })
    if (!current) return privateJson({ error: '시작할 수 있는 내 글을 찾지 못했습니다.' }, { status: 404 })
    if (isRunActive(current)) return privateJson({ error: '이 글은 지금 다른 곳에서 네이버 입력이 진행 중입니다.' }, { status: 409 })

    const runId = newRunId()
    let update = supabase
      .from('blog_posts')
      .update({ naver_input_status: 'in_progress', naver_input_completed_at: null, naver_input_error: null, naver_run_id: runId, naver_lease_expires_at: leaseExpiry() })
      .eq('id', postId)
      .eq('user_id', user.userId)
    // 읽은 뒤 다른 곳에서 상태나 실행이 바뀌었다면 덮어쓰지 않는다.
    update = current.naver_input_status == null ? update.is('naver_input_status', null) : update.eq('naver_input_status', current.naver_input_status)
    update = current.naver_run_id == null ? update.is('naver_run_id', null) : update.eq('naver_run_id', current.naver_run_id)
    const { data: started, error: writeError } = await update.select('id').maybeSingle()
    if (writeError) return privateJson({ error: '입력 시작을 기록하지 못했습니다.' }, { status: 503 })
    if (!started) return privateJson({ error: '글 상태가 그 사이 바뀌어 시작하지 못했습니다. 목록을 새로고침해주세요.' }, { status: 409 })
    return privateJson({ success: true, persisted: true, postId, runId, leaseSeconds: LEASE_MS / 1000 })
  } catch {
    return privateJson({ error: '입력 시작 중 서버 오류가 발생했습니다.' }, { status: 503 })
  }
}
