import { NextResponse } from 'next/server'
import { checkProgramAccessApi } from '@/blog/utils/access'
import { createAdminClient } from '@/blog/utils/supabase/admin'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

// 2026-11-12: 화면의 보관 안내·삭제 예정 배지가 30일 열외 회원(profiles.retention_exempt)을 구분하도록 본인 상태만 돌려준다.
// 실제 삭제 여부는 정리 작업(app/api/cron/cleanup-images)이 같은 칸으로 판정한다. 읽지 못하면 일반 회원 안내(30일)를 보인다.
export async function GET() {
  const headers = { 'Cache-Control': 'private, no-store' }
  const access = await checkProgramAccessApi()
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status, headers })
  const { data, error } = await createAdminClient().from('profiles').select('retention_exempt').eq('id', access.user.id).maybeSingle()
  return NextResponse.json({ exempt: !error && data?.retention_exempt === true }, { headers })
}
