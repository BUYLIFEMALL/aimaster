import { NextResponse } from 'next/server'
import { checkProgramAccessApi } from '@/blog/utils/access'
import { createAdminClient } from '@/blog/utils/supabase/admin'
import { readNaverCategory } from '@/blog/utils/naverCategory'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

// 글 보기·글쓰기 화면의 네이버 카테고리 선택 기본값(v1.57): 이 회원이 가장 최근에 네이버로 보낸 글에서 고른 카테고리.
// 별도 설정 테이블 없이 본인 글에서만 읽는다(본인 글만, 이용 권한 확인).
export async function GET() {
  const access = await checkProgramAccessApi()
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status, headers: { 'Cache-Control': 'private, no-store' } })

  const { data, error } = await createAdminClient()
    .from('blog_posts')
    .select('naver_category')
    .eq('user_id', access.user.id)
    .not('naver_category', 'is', null)
    .not('extension_handoff_at', 'is', null)
    .order('extension_handoff_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) return NextResponse.json({ error: '기본 카테고리를 불러오지 못했습니다.' }, { status: 500, headers: { 'Cache-Control': 'private, no-store' } })
  return NextResponse.json({ category: readNaverCategory(data?.naver_category) }, { headers: { 'Cache-Control': 'private, no-store' } })
}
