import { verifyExtensionToken } from '@/blog/utils/extensionAuth'
import { createAdminClient } from '@/blog/utils/supabase/admin'
import { privateJson } from '@/blog/utils/privateResponse'
import { publicationOf, publicationFingerprint, retentionCutoff, tistoryPostUrl } from '@/blog/utils/autoPublication'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifyExtensionToken(request)
    if (!user) return privateJson({ error: '본인 확장 연결과 프로그램 권한을 확인해 주세요.' }, { status: 401 })
    const id = Number((await context.params).id)
    const input = await request.json().catch(() => null)
    if (!Number.isSafeInteger(id) || id <= 0 || !input || typeof input.runId !== 'string') return privateJson({ error: '글/실행 번호가 필요합니다.' }, { status: 400 })
    const db = createAdminClient()
    const { data: row, error } = await db.from('tistory_posts').select('id,title,content,created_at,tistory_publish,tistory_run_id,tistory_input_status')
      .eq('id', id).eq('user_id', user.userId).gte('created_at', retentionCutoff()).maybeSingle()
    if (error) return privateJson({ error: '발행 기록을 읽지 못했습니다.' }, { status: 503 })
    if (!row) return privateJson({ error: '본인의 보관 기간 안 원고를 찾지 못했습니다.' }, { status: 404 })
    const current = publicationOf(row.tistory_publish)
    if (!current || row.tistory_run_id !== input.runId) return privateJson({ error: '현재 자동 포스팅 실행과 다릅니다.' }, { status: 409 })
    const response = (publication = current) => privateJson({ publication, title: row.title })
    if (input.action === 'status') return response()
    let next = { ...current }
    const now = new Date().toISOString()
    if (input.action === 'arm') {
      if (current.state !== 'queued' || !['completed', 'publish_ready'].includes(row.tistory_input_status)
        || current.fingerprint !== publicationFingerprint(row) || row.tistory_publish.timing !== 'now'
        || !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(input.blogName || '')) {
        return privateJson({ error: '원고·입력 결과·발행 직전 상태를 확인하지 못했습니다. 다시 발행하지 않습니다.' }, { status: 409 })
      }
      next = { ...next, state: 'publishing', runId: input.runId, blogName: input.blogName, armedAt: now }
    } else if (input.action === 'published') {
      const url = tistoryPostUrl(input.url, String(current.blogName || ''))
      if (current.state === 'published' && url === current.url) return response()
      if (!['publishing', 'uncertain'].includes(String(current.state)) || !url) return privateJson({ error: '이 실행의 실제 게시 주소를 확인해 주세요.' }, { status: 409 })
      next = { ...next, state: 'published', url, publishedAt: now, error: null }
    } else if (input.action === 'failed' || input.action === 'uncertain') {
      if (current.state === 'published') return response()
      if (input.action === 'failed' && current.state !== 'queued') return privateJson({ error: '이미 발행을 시작한 실행은 실패로 되돌리지 않습니다.' }, { status: 409 })
      next = { ...next, state: input.action, checkedAt: now, error: String(input.error || '').slice(0, 500) }
    } else return privateJson({ error: '지원하지 않는 발행 동작입니다.' }, { status: 400 })
    const { data: saved, error: writeError } = await db.from('tistory_posts')
      .update({ tistory_publish: { ...row.tistory_publish, automation: next } })
      .eq('id', id).eq('user_id', user.userId).eq('tistory_run_id', input.runId)
      .eq('tistory_publish->automation->>state', current.state).gte('created_at', retentionCutoff())
      .select('id').maybeSingle()
    if (writeError) return privateJson({ error: '발행 결과 저장이 지연됐습니다. 재발행하지 말고 결과만 확인하세요.' }, { status: 503 })
    if (!saved) return privateJson({ error: '다른 요청이 먼저 상태를 바꿨습니다. 결과만 확인하세요.' }, { status: 409 })
    return response(next)
  } catch { return privateJson({ error: '발행 결과 처리 중 오류가 발생했습니다. 자동 재발행하지 않습니다.' }, { status: 503 }) }
}
