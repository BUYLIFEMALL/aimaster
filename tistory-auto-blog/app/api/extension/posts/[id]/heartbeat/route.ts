import { verifyExtensionToken } from '@/blog/utils/extensionAuth'
import { createAdminClient } from '@/blog/utils/supabase/admin'
import { LEASE_MS, leaseExpiry } from '@/blog/utils/extensionTask'
import { privateJson } from '@/blog/utils/privateResponse'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

// 확장이 입력하는 동안 약 45초마다 부르는 "실행이 살아 있음" 알림(v1.43). 실행 번호가 지금 이 글의 실행과 같을 때만 임대를 연장한다.
// 409(superseded)는 웹에서 글이 다시 보내졌거나 이 실행이 이미 끝났다는 뜻 — 확장은 입력을 중지한다.
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifyExtensionToken(request)
    if (!user) return privateJson({ error: '유효하지 않은 연동 토큰이거나 이용 권한이 없습니다.' }, { status: 401 })
    const { id } = await context.params
    const postId = Number(id)
    if (!Number.isSafeInteger(postId) || postId <= 0) return privateJson({ error: '잘못된 글 번호입니다.' }, { status: 400 })
    const input = (await request.json().catch(() => null)) as { runId?: string } | null
    const runId = typeof input?.runId === 'string' ? input.runId.trim() : ''
    if (!runId) return privateJson({ error: '실행 번호가 필요합니다.' }, { status: 400 })

    const { data, error } = await createAdminClient()
      .from('tistory_posts')
      .update({ tistory_lease_expires_at: leaseExpiry() })
      .eq('id', postId)
      .eq('user_id', user.userId)
      .eq('tistory_run_id', runId)
      .in('tistory_input_status', ['in_progress', 'completed'])
      .select('id')
      .maybeSingle()
    if (error) return privateJson({ error: '실행 상태를 갱신하지 못했습니다.' }, { status: 503 })
    if (!data) return privateJson({ error: '이 실행은 더 이상 유효하지 않습니다. 웹에서 글이 다시 보내졌거나 이미 끝났습니다.', superseded: true }, { status: 409 })
    return privateJson({ ok: true, leaseSeconds: LEASE_MS / 1000 })
  } catch {
    return privateJson({ error: '실행 상태 갱신 중 서버 오류가 발생했습니다.' }, { status: 503 })
  }
}
