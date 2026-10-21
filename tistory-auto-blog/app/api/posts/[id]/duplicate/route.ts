import { checkProgramAccessApi } from '@/blog/utils/access'
import { createAdminClient } from '@/blog/utils/supabase/admin'
import { readTistoryPublish } from '@/blog/utils/tistoryPublish'
import { retentionCutoff } from '@/blog/utils/autoPublication'
import { privateJson } from '@/blog/utils/privateResponse'

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await checkProgramAccessApi()
  if (!access.allowed) return privateJson({ error: access.error }, { status: access.status })
  const id = Number((await context.params).id)
  if (!Number.isSafeInteger(id) || id <= 0) return privateJson({ error: '원고 번호를 확인해 주세요.' }, { status: 400 })
  const db = createAdminClient()
  const { data: original } = await db.from('tistory_posts').select('title,excerpt,content,reading_minutes,author_id,published_at,created_at,tistory_publish')
    .eq('id', id).eq('user_id', access.user.id).gte('created_at', retentionCutoff()).maybeSingle()
  if (!original) return privateJson({ error: '본인의 보관 기간 안 원고를 찾지 못했습니다.' }, { status: 404 })
  const { data, error } = await db.from('tistory_posts').insert({ ...original, user_id: access.user.id, tistory_publish: readTistoryPublish(original.tistory_publish) })
    .select('id').single()
  if (error || !data) return privateJson({ error: '새 원고 복제에 실패했습니다.' }, { status: 503 })
  return privateJson({ id: data.id })
}
