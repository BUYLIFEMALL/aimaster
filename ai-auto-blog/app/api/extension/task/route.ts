import { verifyExtensionToken } from '@/blog/utils/extensionAuth'
import { createAdminClient } from '@/blog/utils/supabase/admin'
import { htmlToInputBlocks } from '@/blog/utils/extensionContent'
import { autoStartCutoff } from '@/blog/utils/extensionTask'
import { privateJson } from '@/blog/utils/privateResponse'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

// 확장 작업기가 10초마다 부르는 "자동 입력 작업 가져가기"(2026-10-10, v1.40).
// 웹에서 방금 보낸(30분 이내) 본인 글 중 가장 오래된 1건을 "입력 중"으로 바꾸면서 가져간다.
// 바꾸는 순간에 아직 대기 상태인지 다시 확인하므로, 확장이 두 개 켜져 있어도 한 곳만 같은 글을 가져간다.
export async function POST(request: Request) {
  try {
    return await claimTask(request)
  } catch {
    return privateJson({ error: '자동 입력 작업 확인 중 서버 오류가 발생했습니다.' }, { status: 503 })
  }
}

async function claimTask(request: Request) {
  const user = await verifyExtensionToken(request)
  if (!user) return privateJson({ error: '유효하지 않은 연동 토큰이거나 이용 권한이 없습니다.' }, { status: 401 })

  const supabase = createAdminClient()
  const cutoff = autoStartCutoff()

  const { data: candidate, error: findError } = await supabase
    .from('blog_posts')
    .select('id')
    .eq('user_id', user.userId)
    .is('naver_input_status', null)
    .gte('extension_handoff_at', cutoff)
    .order('extension_handoff_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (findError) return privateJson({ error: '자동 입력 작업을 확인하지 못했습니다.' }, { status: 503 })
  if (!candidate) return privateJson({ task: null })

  const { data: claimed, error: claimError } = await supabase
    .from('blog_posts')
    .update({ naver_input_status: 'in_progress', naver_input_completed_at: null, naver_input_error: null })
    .eq('id', candidate.id)
    .eq('user_id', user.userId)
    .is('naver_input_status', null)
    .gte('extension_handoff_at', cutoff)
    .select('id, title, content, extension_handoff_at')
    .maybeSingle()
  if (claimError) return privateJson({ error: '자동 입력 작업을 가져가지 못했습니다.' }, { status: 503 })
  if (!claimed) return privateJson({ task: null }) // 다른 확장이 먼저 가져감

  const { blocks, tags } = htmlToInputBlocks(claimed.content || '', claimed.title || '')
  return privateJson({
    task: {
      id: claimed.id,
      title: claimed.title || '',
      handoffAt: claimed.extension_handoff_at,
      blocks,
      tags,
    },
  })
}
