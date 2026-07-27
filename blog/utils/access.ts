import 'server-only'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

// 이 앱(blog)은 AIMaster와 같은 Supabase 프로젝트를 공유한다.
// 로그인 여부만으로는 부족하고, AIMaster의 programs/subscriptions/user_program_access
// 테이블을 기준으로 "이 프로그램을 실제로 이용할 권한이 있는지"까지 확인해야 한다.
// threads(threads/src/lib/access.ts)와 동일한 패턴.
type SupabaseLike = {
  from: (table: string) => any // eslint-disable-line @typescript-eslint/no-explicit-any
}

const THIS_PROGRAM_SLUG = 'ai-auto-blog'
const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? 'https://buylife.xyz'

function isNotExpired(expiresAt: string | null): boolean {
  return !expiresAt || new Date(expiresAt) > new Date()
}

/**
 * 로그인 + "ai-auto-blog" 프로그램 이용 권한을 함께 확인한다.
 * 권한이 없으면 AIMaster의 프로그램 구매 페이지로 리다이렉트한다.
 */
export async function requireProgramAccess() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  const sb = supabase as unknown as SupabaseLike

  const { data: program } = await sb
    .from('programs')
    .select('id, required_grade_id')
    .eq('slug', THIS_PROGRAM_SLUG)
    .eq('is_active', true)
    .single()

  if (!program) {
    redirect(`${MAIN_SITE_URL}/programs/${THIS_PROGRAM_SLUG}`)
  }

  const { data: subs } = await sb
    .from('subscriptions')
    .select('status, expires_at')
    .eq('user_id', user!.id)
    .eq('program_id', program.id)

  const hasActiveSub = (subs ?? []).some(
    (s: { status: string; expires_at: string | null }) =>
      s.status === 'active' && isNotExpired(s.expires_at)
  )
  if (hasActiveSub) return user!

  const { data: grant } = await sb
    .from('user_program_access')
    .select('expires_at')
    .eq('user_id', user!.id)
    .eq('program_id', program.id)
    .maybeSingle()
  if (grant && isNotExpired(grant.expires_at)) return user!

  if (!program.required_grade_id) return user!

  const { data: profile } = await sb
    .from('profiles')
    .select('grade:member_grades(sort_order)')
    .eq('id', user!.id)
    .single()

  const { data: requiredGrade } = await sb
    .from('member_grades')
    .select('sort_order')
    .eq('id', program.required_grade_id)
    .single()

  const userGrade = Array.isArray(profile?.grade) ? profile?.grade[0] : profile?.grade
  if (userGrade && requiredGrade && userGrade.sort_order >= requiredGrade.sort_order) {
    return user!
  }

  redirect(`${MAIN_SITE_URL}/programs/${THIS_PROGRAM_SLUG}`)
}

/** 로그인한 사용자를 반환하되, 권한 검사 없이 사용자 여부만 확인한다 (API route에서 재사용). */
export async function getSessionUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}
