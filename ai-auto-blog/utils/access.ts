import 'server-only'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/blog/utils/supabase/server'
import { createAdminClient } from '@/blog/utils/supabase/admin'
import { checkProgramAccess } from '@/lib/access/checkProgramAccess'

// 이 앱(blog)은 AIMaster와 같은 Supabase 프로젝트를 공유한다.
// 로그인 여부만으로는 부족하고, AIMaster의 programs/subscriptions/user_program_access
// 테이블을 기준으로 "이 프로그램을 실제로 이용할 권한이 있는지"까지 확인해야 한다.
// threads(threads/src/lib/access.ts)와 동일한 패턴.
type SupabaseLike = {
  from: (table: string) => any // eslint-disable-line @typescript-eslint/no-explicit-any
}

const THIS_PROGRAM_SLUG = 'ai-auto-blog'
const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? 'https://buylife.xyz'

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
    // 2026-10-01 독립 배포(ai-auto-blog.vercel.app)부터 로그인은 이 앱의 /auth에서 한다.
    // 딥링크로 들어왔다면 로그인 후 그 화면으로 돌아오도록 proxy.ts가 실어준 현재 경로를 넘긴다.
    const currentPath = (await headers()).get('x-pathname') ?? '/'
    redirect(`/auth?redirect=${encodeURIComponent(currentPath)}`)
  }

  // 판정 규칙(2026-09-29 베타테스트 정책)은 lib/access/checkProgramAccess.ts(루트 같은 파일의 사본 — 규칙이 바뀌면 둘 다 고칠 것)에 둔다.
  const access = await checkProgramAccess(createAdminClient() as unknown as SupabaseLike, user!.id, THIS_PROGRAM_SLUG)
  if (access.reason === 'suspended') {
    redirect(`${MAIN_SITE_URL}/programs/${THIS_PROGRAM_SLUG}?error=suspended`)
  }
  if (access.allowed) return user!

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

/**
 * requireProgramAccess()와 동일한 판정 로직이지만, API route handler에서
 * 쓸 수 있도록 redirect() 대신 결과 객체를 반환한다.
 * (route handler에서 redirect()를 쓰면 fetch 호출자가 HTML 리다이렉트를
 * 받아 res.json() 파싱에 실패하는 문제가 있어 분리했다.)
 */
export async function checkProgramAccessApi(): Promise<
  { allowed: true; user: NonNullable<Awaited<ReturnType<typeof getSessionUser>>> } | { allowed: false; error: string; status: number }
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { allowed: false, error: '로그인이 필요합니다.', status: 401 }
  }

  const access = await checkProgramAccess(createAdminClient() as unknown as SupabaseLike, user.id, THIS_PROGRAM_SLUG)
  if (access.reason === 'suspended') {
    return { allowed: false, error: '계정이 정지되어 이용할 수 없습니다. 고객센터에 문의해주세요.', status: 403 }
  }
  if (access.allowed) return { allowed: true, user }

  return { allowed: false, error: 'AI 자동 블로그 이용 권한이 없습니다. 구독 후 이용해주세요.', status: 403 }
}
