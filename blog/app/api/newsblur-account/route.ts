import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/blog/utils/supabase/admin'
import { checkProgramAccessApi } from '@/blog/utils/access'
import { newsblurLogin } from '@/blog/utils/ai/collector'

export const dynamic = 'force-dynamic'

/** NewsBlur 계정을 연결한다 (저장 전에 실제로 로그인이 되는지 먼저 확인한다). */
export async function POST(request: NextRequest) {
  const access = await checkProgramAccessApi()
  if (!access.allowed) {
    return NextResponse.json({ error: access.error }, { status: access.status })
  }
  const user = access.user

  const body = await request.json()
  const username = String(body.username ?? '').trim()
  const password = String(body.password ?? '').trim()
  if (!username || !password) {
    return NextResponse.json({ error: '아이디와 비밀번호를 모두 입력해주세요.' }, { status: 400 })
  }

  try {
    await newsblurLogin(username, password)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'NewsBlur 로그인 확인에 실패했습니다.' },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('newsblur_accounts')
    .upsert({ user_id: user.id, username, password }, { onConflict: 'user_id' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}

/** NewsBlur 계정 연결을 해제한다. */
export async function DELETE() {
  const access = await checkProgramAccessApi()
  if (!access.allowed) {
    return NextResponse.json({ error: access.error }, { status: access.status })
  }
  const user = access.user

  const supabase = createAdminClient()
  await supabase.from('newsblur_accounts').delete().eq('user_id', user.id)

  return NextResponse.json({ success: true })
}
