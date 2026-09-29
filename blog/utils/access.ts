import 'server-only'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/blog/utils/supabase/server'
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
    // blog는 자체 Vercel 배포 없이 www.buylife.xyz/blog로 루트 앱에 내장되는데,
    // 루트에는 "/auth"가 없고 "/login"만 있다. "/auth"로 보내면 404가 떠서 실제로는
    // 로그인만 다시 하면 되는 사용자가 "접근 안 됨"으로 오해하게 된다
    // (2026-08-19에 dashboard/candidates/write-ai-form 등 다른 페이지에서 같은
    // 버그를 이미 한 번 고쳤는데, 모든 페이지가 공통으로 거치는 이 access.ts
    // 자체는 그때 빠뜨렸다 — judee1004 계정 "접근 안 됨" 신고로 재발견, 2026-08-29).
    // 딥링크로 바로 들어왔다면 로그인 후 그 페이지로 바로 이어지도록, 루트
    // middleware.ts가 실어준 현재 경로를 /login의 ?redirect=로 넘긴다 — 루트의
    // LoginForm.tsx가 이미 이 파라미터를 읽어 로그인 후 그 경로로 이동시켜준다.
    const currentPath = (await headers()).get('x-pathname') ?? '/blog'
    redirect(`/login?redirect=${encodeURIComponent(currentPath)}`)
  }

  // 판정 규칙(2026-09-29 베타테스트 정책)은 루트 lib/access/checkProgramAccess.ts 한 곳에만 둔다.
  const access = await checkProgramAccess(supabase as unknown as SupabaseLike, user!.id, THIS_PROGRAM_SLUG)
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

  const access = await checkProgramAccess(supabase as unknown as SupabaseLike, user.id, THIS_PROGRAM_SLUG)
  if (access.reason === 'suspended') {
    return { allowed: false, error: '계정이 정지되어 이용할 수 없습니다. 고객센터에 문의해주세요.', status: 403 }
  }
  if (access.allowed) return { allowed: true, user }

  return { allowed: false, error: 'AI 자동 블로그 이용 권한이 없습니다. 구독 후 이용해주세요.', status: 403 }
}
