import { randomUUID } from 'node:crypto'
import { publicationOf, publicationFingerprint, retentionCutoff } from '@/blog/utils/autoPublication'
import { NextResponse } from 'next/server'
import { checkProgramAccessApi } from '@/blog/utils/access'
import { createAdminClient } from '@/blog/utils/supabase/admin'
import { AUTO_START_WINDOW_MS, isRunActive } from '@/blog/utils/extensionTask'
import { parseTistoryPublish, readTistoryPublish, type TistoryPublish } from '@/blog/utils/tistoryPublish'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

// 글 보기 화면의 "티스토리 입력기로 보내기" — 이 글을 티스토리 크롬 확장의 "자동 입력 대기"로 올린다(본인 글만, 이용 권한 확인).
// 확장이 켜져 있으면 보낸 뒤 30분 안에 가져가 티스토리 편집기 입력을 자동으로 시작한다(v1.57). 30분이 지나면 자동 시작하지 않으니 웹에서 다시 보낸다.
// 다시 보내면 입력 상태·실행 번호·임대를 지우고 목록 맨 위로 올린다. 단, 지금 입력 중인 글은 덮어쓰지 않는다.
// 본문에 "publish"(카테고리·공개 범위·댓글·홈주제·발행 시점)가 있으면 이 글의 발행 설정으로 저장하고, 없으면 이전에 정한 값을 그대로 둔다.
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await checkProgramAccessApi()
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status })

  const { id } = await context.params
  const postId = Number(id)
  if (!Number.isSafeInteger(postId) || postId <= 0) return NextResponse.json({ error: '잘못된 글 번호입니다.' }, { status: 400 })

  const body = await request.json().catch(() => ({}))
  let publishUpdate: { tistory_publish: TistoryPublish } | Record<string, never> = {}
  if (body && typeof body === 'object' && 'publish' in body) {
    try { publishUpdate = { tistory_publish: parseTistoryPublish((body as { publish: unknown }).publish) } }
    catch (error) { return NextResponse.json({ error: (error as { message?: string })?.message || '발행 설정 형식이 올바르지 않습니다.' }, { status: 400 }) }
  }

  const supabase = createAdminClient()
  const { data: current, error: readError } = await supabase
    .from('tistory_posts')
    .select('id,title,content,created_at,tistory_publish,tistory_run_id,tistory_input_status,extension_handoff_at,tistory_lease_expires_at')
    .eq('id', postId)
    .eq('user_id', access.user.id)
    .maybeSingle()
  if (readError) return NextResponse.json({ error: '티스토리 입력기로 보내기에 실패했습니다.' }, { status: 500 })
  if (!current) return NextResponse.json({ error: '본인이 작성한 글만 보낼 수 있습니다.' }, { status: 403 })

  if (publicationOf(current.tistory_publish)) return NextResponse.json({ error: '자동 포스팅 실행 원고는 재전송하지 않습니다. 결과를 확인하거나 새 원고로 복제하세요.' }, { status: 409 })
  if (!current.created_at || current.created_at < retentionCutoff()) return NextResponse.json({ error: '보관 기간이 지난 원고입니다.' }, { status: 404 })
  const selected = 'tistory_publish' in publishUpdate ? publishUpdate.tistory_publish : readTistoryPublish(current.tistory_publish)
  const automatic = body?.mode === 'auto'
  if (automatic && selected.timing !== 'now') return NextResponse.json({ error: '자동 포스팅은 현재 발행을 선택해 주세요. 예약 설정은 입력 준비로 보낼 수 있습니다.' }, { status: 400 })
  const storedPublish = { ...selected, _revision: randomUUID(), ...(automatic ? { automation: { mode: 'auto', state: 'queued', requestedAt: new Date().toISOString(), fingerprint: publicationFingerprint({ ...current, tistory_publish: selected }) } } : {}) }

  // 살아 있는 실행(임대가 남은 입력 중)이 있으면 덮어쓰지 않는다. 임대가 끝난 실행(PC 꺼짐·확장 종료)은 다시 보낼 수 있다.
  if (isRunActive(current)) {
    return NextResponse.json({ error: '이 글은 지금 티스토리 입력이 진행 중입니다. 입력이 끝난 뒤 다시 보내주세요.' }, { status: 409 })
  }

  let update = supabase
    .from('tistory_posts')
    .update({
      extension_handoff_at: new Date().toISOString(),
      tistory_input_status: null,
      tistory_input_completed_at: null,
      tistory_input_error: null,
      tistory_run_id: null,
      tistory_lease_expires_at: null,
      tistory_publish: storedPublish,
    })
    .eq('id', postId)
    .eq('user_id', access.user.id)
    .is('tistory_publish->automation->>mode', null)
    .gte('created_at', retentionCutoff())
  update = current.tistory_publish?._revision ? update.eq('tistory_publish->>_revision', current.tistory_publish._revision) : update.is('tistory_publish->>_revision', null)
  update = current.tistory_run_id ? update.eq('tistory_run_id', current.tistory_run_id) : update.is('tistory_run_id', null)
  const { data, error } = await update.select('id, extension_handoff_at')
    .maybeSingle()
  if (error) return NextResponse.json({ error: '티스토리 입력기로 보내기에 실패했습니다.' }, { status: 500 })
  if (!data) return NextResponse.json({ error: '본인이 작성한 글만 보낼 수 있습니다.' }, { status: 403 })
  // ok는 글쓰기 화면이 확인하는 값, success는 글 보기 화면과 옛 응답 호환용이다.
  return NextResponse.json({ ok: true, success: true, handoffAt: data.extension_handoff_at, autoStartMinutes: AUTO_START_WINDOW_MS / 60000 })
}
