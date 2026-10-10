import { NextResponse } from 'next/server'
import { checkProgramAccessApi } from '@/blog/utils/access'
import { createAdminClient } from '@/blog/utils/supabase/admin'
import { readTistoryPublish } from '@/blog/utils/tistoryPublish'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

// 글 보기 화면의 발행 설정 기본값(v1.58): 이 회원이 가장 최근에 티스토리로 보낸 글에서 정한 발행 설정(카테고리·공개 범위·댓글·홈주제).
// 별도 설정 테이블 없이 본인 글에서만 읽는다(본인 글만, 이용 권한 확인). 예약 발행은 이어받지 않고 현재 발행으로 시작한다.
export async function GET() {
  const headers = { 'Cache-Control': 'private, no-store' }
  const access = await checkProgramAccessApi()
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status, headers })

  const { data, error } = await createAdminClient()
    .from('tistory_posts')
    .select('tistory_publish')
    .eq('user_id', access.user.id)
    .not('tistory_publish', 'is', null)
    .not('extension_handoff_at', 'is', null)
    .order('extension_handoff_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) return NextResponse.json({ error: '기본 발행 설정을 불러오지 못했습니다.' }, { status: 500, headers })
  if (!data) return NextResponse.json({ publish: null }, { headers })
  const publish = readTistoryPublish(data.tistory_publish)
  return NextResponse.json({ publish: { ...publish, timing: 'now', reserveDate: '', reserveTime: '' } }, { headers })
}
